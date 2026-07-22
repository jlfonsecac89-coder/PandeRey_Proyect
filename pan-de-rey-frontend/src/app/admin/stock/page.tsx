"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  X, 
  User, 
  Calendar,
  Layers,
  ArrowRight,
  History,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/utils/format';

interface InventoryItem {
  variantId: string;
  variantName: string;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  safetyBuffer: number;
  lastUpdated: string | null;
}

interface InventoryMovement {
  id: string;
  variant_id: string;
  quantity_change: number;
  movement_type: string;
  reference_id: string | null;
  performedBy?: string | null;
  reason?: string | null;
  created_at: string;
  variantName: string;
  productName: string;
}

export default function StockControl() {
  const [mounted, setMounted] = useState(false);
  
  // Database States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Restock Modal States
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChangeInput, setQuantityChangeInput] = useState<number>(10);
  const [restockUser, setRestockUser] = useState<string>('Panadero Jefe');
  const [restockReason, setRestockReason] = useState<string>('Reposición diaria de almacén');
  const [isNegative, setIsNegative] = useState<boolean>(false); // for waste/loss vs restock
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, movRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory/movements')
      ]);
      if (invRes.ok && movRes.ok) {
        setInventory(await invRes.json());
        setMovements(await movRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar inventario de Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusFilterClick = (statusKey: string) => {
    if (statusFilter === statusKey) {
      setStatusFilter('all');
    } else {
      setStatusFilter(statusKey);
    }
  };

  // Helper to determine status and colors
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'text-red-400 border-red-500/20 bg-red-500/5', barColor: 'bg-red-500', key: 'out_of_stock' };
    if (stock < 3) return { label: 'Crítico', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', barColor: 'bg-orange-500', key: 'critical' };
    if (stock < 5) return { label: 'Riesgo', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', barColor: 'bg-amber-500', key: 'warning' };
    if (stock < 8) return { label: 'Alerta', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', barColor: 'bg-yellow-500', key: 'alert' };
    return { label: 'Estable', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', barColor: 'bg-emerald-500', key: 'stable' };
  };

  if (!mounted) return null;

  // Stock Alert Counts
  const sinStockCount = inventory.filter(p => p.quantity === 0).length;
  const criticoCount = inventory.filter(p => p.quantity > 0 && p.quantity < 3).length;
  const riesgoCount = inventory.filter(p => p.quantity >= 3 && p.quantity < 5).length;
  const alertaCount = inventory.filter(p => p.quantity >= 5 && p.quantity < 8).length;
  const estableCount = inventory.filter(p => p.quantity >= 8).length;

  // Filtered Inventory List
  const filteredInventory = inventory.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getStockStatus(p.quantity);
    const matchesStatus = statusFilter === 'all' || status.key === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open restock dialog
  const handleOpenRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantityChangeInput(10);
    setIsNegative(false);
    setRestockUser('Panadero Jefe');
    setRestockReason('Reposición diaria de almacén');
    setIsRestockOpen(true);
  };

  // Execute restocking/waste adjustment
  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (quantityChangeInput <= 0) {
      showToast('La cantidad debe ser mayor a cero.', 'error');
      return;
    }

    const finalChange = isNegative ? -quantityChangeInput : quantityChangeInput;
    const movementType = isNegative ? 'Merma / Descarte' : 'Reabastecimiento Manual';
    
    // Audit Signature: Responsable & Motivo
    const referenceSignature = `Resp: ${restockUser} | Motivo: ${restockReason.trim()}`;

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedItem.variantId,
          quantityChange: finalChange,
          movementType,
          referenceId: referenceSignature,
          performedBy: restockUser,
          reason: restockReason.trim()
        })
      });

      if (res.ok) {
        showToast(`Stock de "${selectedItem.productName}" ajustado correctamente (${finalChange > 0 ? '+' : ''}${finalChange}).`);
        setIsRestockOpen(false);
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al ajustar el inventario.', 'error');
      }
    } catch (err) {
      showToast('Error de red al registrar el ajuste.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-6 py-4 rounded shadow-2xl border z-[300] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-950/80 border-red-500 text-red-200' 
            : 'bg-[#121008]/90 border-gold/40 text-gold-hover'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-white mb-2 tracking-wide font-semibold">Control de Inventario & Stock</h1>
        <p className="text-gray-400 text-sm">Monitorea niveles de stock real en Supabase, registra mermas y auditoría de movimientos firmados.</p>
      </div>

      {/* Alert KPI Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div 
          onClick={() => handleStatusFilterClick('stable')}
          className={`cursor-pointer rounded p-4 flex items-center justify-between border transition-all ${
            statusFilter === 'stable' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400' : 'bg-charcoal-light/10 border-charcoal-border hover:border-emerald-500/40 text-gray-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider">Estable</span>
          <span className="text-xl font-bold">{estableCount}</span>
        </div>
        <div 
          onClick={() => handleStatusFilterClick('alert')}
          className={`cursor-pointer rounded p-4 flex items-center justify-between border transition-all ${
            statusFilter === 'alert' ? 'bg-yellow-950/20 border-yellow-500 text-yellow-400' : 'bg-charcoal-light/10 border-charcoal-border hover:border-yellow-500/40 text-gray-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider">Alerta</span>
          <span className="text-xl font-bold">{alertaCount}</span>
        </div>
        <div 
          onClick={() => handleStatusFilterClick('warning')}
          className={`cursor-pointer rounded p-4 flex items-center justify-between border transition-all ${
            statusFilter === 'warning' ? 'bg-amber-950/20 border-amber-500 text-amber-400' : 'bg-charcoal-light/10 border-charcoal-border hover:border-amber-500/40 text-gray-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider">Riesgo</span>
          <span className="text-xl font-bold">{riesgoCount}</span>
        </div>
        <div 
          onClick={() => handleStatusFilterClick('critical')}
          className={`cursor-pointer rounded p-4 flex items-center justify-between border transition-all ${
            statusFilter === 'critical' ? 'bg-orange-950/20 border-orange-500 text-orange-400' : 'bg-charcoal-light/10 border-charcoal-border hover:border-orange-500/40 text-gray-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider">Crítico</span>
          <span className="text-xl font-bold">{criticoCount}</span>
        </div>
        <div 
          onClick={() => handleStatusFilterClick('out_of_stock')}
          className={`cursor-pointer rounded p-4 flex items-center justify-between border transition-all ${
            statusFilter === 'out_of_stock' ? 'bg-red-950/20 border-red-500 text-red-400' : 'bg-charcoal-light/10 border-charcoal-border hover:border-red-500/40 text-gray-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider">Quiebre</span>
          <span className="text-xl font-bold">{sinStockCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Stock Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-charcoal-light/20 border border-charcoal-border rounded p-4 flex items-center gap-4">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-gray-300 text-xs rounded outline-none w-full"
            />
          </div>

          <div className="bg-charcoal-light/10 rounded border border-charcoal-border overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0d0d0d] text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
                <tr>
                  <th className="px-6 py-4.5">Producto</th>
                  <th className="px-6 py-4.5">Estado</th>
                  <th className="px-6 py-4.5 text-center">Cantidad Real</th>
                  <th className="px-6 py-4.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-500">Cargando inventario real...</td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-500">No se encontraron productos.</td></tr>
                ) : (
                  filteredInventory.map(item => {
                    const status = getStockStatus(item.quantity);
                    return (
                      <tr key={item.variantId} className="border-b border-charcoal-border/40 hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded overflow-hidden border border-charcoal-border bg-[#0d0d0d] shrink-0">
                              {item.imageUrl ? <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" /> : <Layers className="w-4 h-4 m-2 text-gray-600" />}
                            </div>
                            <div>
                              <span className="font-bold text-white text-xs block">{item.productName}</span>
                              <span className="text-[9px] text-gray-500">{item.variantName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-serif text-sm font-bold text-white">{item.quantity} un.</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleOpenRestock(item)} className="bg-gold/10 hover:bg-gold text-gold hover:text-black border border-gold/20 hover:border-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors">Ajustar</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail movements panel */}
        <div className="lg:col-span-4 bg-charcoal-light/10 border border-charcoal-border rounded p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-charcoal-border/50 pb-3">
            <History className="w-5 h-5 text-gold" />
            <h3 className="font-serif text-lg text-white font-bold">Bitácora de Auditoría</h3>
          </div>
          <p className="text-gray-400 text-xs">Firmas y registros de auditoría de los últimos 100 movimientos de stock.</p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {movements.length === 0 ? (
              <p className="text-center py-10 text-gray-600 text-xs italic font-light">No hay registros de movimientos recientes.</p>
            ) : (
              movements.map(mov => {
                const isAdd = mov.quantity_change > 0;
                return (
                  <div key={mov.id} className="bg-[#0b0b0b] border border-charcoal-border/40 rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-gray-300 truncate max-w-[150px]">{mov.productName}</span>
                      <span className={`text-[10px] font-black font-mono ${isAdd ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isAdd ? '+' : ''}{mov.quantity_change}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>{mov.movement_type}</span>
                      <span>
                        {new Date(mov.created_at).toLocaleDateString('es-ES', { 
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {mov.performedBy || mov.reason ? (
                      <div className="bg-charcoal-light/30 border-l border-gold/30 p-1.5 rounded text-[8px] font-mono text-gold-hover leading-normal space-y-0.5">
                        {mov.performedBy && <div><strong>Resp:</strong> {mov.performedBy}</div>}
                        {mov.reason && <div><strong>Motivo:</strong> {mov.reason}</div>}
                      </div>
                    ) : mov.reference_id ? (
                      <div className="bg-charcoal-light/30 border-l border-gold/30 p-1.5 rounded text-[8px] font-mono text-gold-hover leading-relaxed">
                        {mov.reference_id}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Restock/Adjustment Modal Dialog */}
      {isRestockOpen && selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" onClick={() => setIsRestockOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-charcoal-light border border-charcoal-border rounded-lg shadow-2xl z-[201] p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-charcoal-border mb-5">
              <div>
                <h3 className="font-serif text-lg text-white">Ajuste de Inventario</h3>
                <p className="text-xs text-gray-500 mt-0.5">Firmar movimiento de stock en Supabase.</p>
              </div>
              <button onClick={() => setIsRestockOpen(false)} className="text-gray-400 hover:text-white p-1.5 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-5">
              
              <div className="flex items-center gap-3 bg-[#0d0d0d] p-3 rounded border border-charcoal-border/50">
                <div className="relative w-10 h-10 rounded overflow-hidden border border-charcoal-border shrink-0">
                  {selectedItem.imageUrl ? <Image src={selectedItem.imageUrl} alt={selectedItem.productName} fill className="object-cover" /> : <Layers className="w-5 h-5 m-2.5 text-gray-600" />}
                </div>
                <div>
                  <h4 className="font-serif text-white font-semibold text-sm truncate max-w-[250px]">{selectedItem.productName}</h4>
                  <p className="text-[10px] text-gray-500">Stock real: <span className="font-bold text-white">{selectedItem.quantity} un.</span></p>
                </div>
              </div>

              {/* Adjust type selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsNegative(false)} 
                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${!isNegative ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400' : 'bg-[#0d0d0d] border-charcoal-border text-gray-400'}`}
                  >
                    Ingreso / Carga
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsNegative(true)} 
                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${isNegative ? 'bg-red-950/20 border-red-500 text-red-400' : 'bg-[#0d0d0d] border-charcoal-border text-gray-400'}`}
                  >
                    Salida / Merma
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cantidad</label>
                <input 
                  type="number"
                  min="1"
                  value={quantityChangeInput || ''}
                  onChange={(e) => setQuantityChangeInput(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Usuario Responsable (Firma)</label>
                <select
                  value={restockUser}
                  onChange={(e) => setRestockUser(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                >
                  <option value="Panadero Jefe">Panadero Jefe (Producción)</option>
                  <option value="Encargado de Almacén">Encargado de Almacén (Logística)</option>
                  <option value="Usuario Administrador">Usuario Administrador (Gerencia)</option>
                  <option value="Control de Turno">Control de Turno (Operaciones)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Motivo del Ajuste *</label>
                <input 
                  type="text"
                  placeholder="Ej. Descarte por quemadura / Entrada lote mañana"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40"
                  required
                />
              </div>

              <div className="flex items-center justify-center gap-3 py-3 border-t border-b border-charcoal-border/50 text-xs text-gray-400">
                <span>{selectedItem.quantity} un.</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold" />
                <span className="font-bold text-white">
                  {selectedItem.quantity + (isNegative ? -quantityChangeInput : quantityChangeInput)} un. (Resultado)
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsRestockOpen(false)} className="px-4 py-2 border border-charcoal-border text-gray-400 hover:text-white text-xs font-bold uppercase rounded">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded">Registrar Ajuste Firmado</button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
