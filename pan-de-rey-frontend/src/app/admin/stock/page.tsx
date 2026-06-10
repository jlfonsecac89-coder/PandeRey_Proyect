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
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { 
  getLocalProducts, 
  getLocalOrders, 
  restockProduct, 
  SimProduct 
} from '@/utils/dbSim';
import { formatPrice } from '@/utils/format';

export default function StockControl() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<SimProduct[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Restock Modal States
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SimProduct | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockUser, setRestockUser] = useState<string>('Panadero Jefe');
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setProducts(getLocalProducts());
    setOrders(getLocalOrders());
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

  if (!mounted) return null;

  // 1. Output Analysis (Salidas del Día)
  const localTodayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  
  // Filter orders created today (or fallback to the most recent date if today is empty)
  let targetOrders = orders.filter(o => o.createdAt && o.createdAt.split('T')[0] === localTodayStr);
  let isUsingFallback = false;
  let displayDateStr = 'hoy';

  if (targetOrders.length === 0 && orders.length > 0) {
    // Fallback to orders from the most recent date available in the database
    const dates = orders.map(o => o.createdAt.split('T')[0]).filter(Boolean);
    if (dates.length > 0) {
      const mostRecentDateStr = dates[0];
      targetOrders = orders.filter(o => o.createdAt.split('T')[0] === mostRecentDateStr);
      isUsingFallback = true;
      const formattedDate = new Date(mostRecentDateStr + 'T12:00:00').toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
      displayDateStr = `el ${formattedDate}`;
    }
  }

  // Parse quantities sold per product
  const itemSalesMap: { [productName: string]: number } = {};
  let totalUnitsSold = 0;

  targetOrders.forEach(o => {
    if (o.itemsRaw && o.itemsRaw.length > 0) {
      o.itemsRaw.forEach((it: any) => {
        const qty = it.quantity || 0;
        const name = it.productName || '';
        if (name) {
          itemSalesMap[name] = (itemSalesMap[name] || 0) + qty;
          totalUnitsSold += qty;
        }
      });
    } else {
      // Fallback parser for plain text items
      o.items.forEach((it: string) => {
        const match = it.match(/^(\d+)x\s+([^(]+)/);
        if (match) {
          const qty = parseInt(match[1], 10);
          const prodName = match[2].trim();
          itemSalesMap[prodName] = (itemSalesMap[prodName] || 0) + qty;
          totalUnitsSold += qty;
        }
      });
    }
  });

  // Identify top sold product
  let topProduct = 'Ninguno';
  let topProductQty = 0;
  Object.keys(itemSalesMap).forEach(name => {
    if (itemSalesMap[name] > topProductQty) {
      topProduct = name;
      topProductQty = itemSalesMap[name];
    }
  });

  // Calculate % of daily stock consumed
  const currentTotalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockOfTheDay = currentTotalStock + totalUnitsSold;
  const percentConsumed = totalStockOfTheDay > 0 
    ? Math.round((totalUnitsSold / totalStockOfTheDay) * 100) 
    : 0;

  // 2. Stock Alert Counts
  const sinStockCount = products.filter(p => p.stock === 0).length;
  const criticoCount = products.filter(p => p.stock > 0 && p.stock < 3).length;
  const riesgoCount = products.filter(p => p.stock >= 3 && p.stock < 5).length;
  const alertaCount = products.filter(p => p.stock >= 5 && p.stock < 8).length;
  const estableCount = products.filter(p => p.stock >= 8).length;

  // Helper to determine status and colors
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'text-red-400 border-red-500/20 bg-red-500/5', barColor: 'bg-red-500', key: 'out_of_stock' };
    if (stock < 3) return { label: 'Crítico', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', barColor: 'bg-orange-500', key: 'critical' };
    if (stock < 5) return { label: 'Riesgo', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', barColor: 'bg-amber-500', key: 'warning' };
    if (stock < 8) return { label: 'Alerta', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', barColor: 'bg-yellow-500', key: 'alert' };
    return { label: 'Estable', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', barColor: 'bg-emerald-500', key: 'stable' };
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getStockStatus(p.stock);
    const matchesStatus = statusFilter === 'all' || status.key === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Open restock dialog
  const handleOpenRestock = (product: SimProduct) => {
    setSelectedProduct(product);
    setRestockQty(10);
    setRestockUser('Panadero Jefe');
    setIsRestockOpen(true);
  };

  // Execute restocking
  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (restockQty <= 0) {
      showToast('La cantidad a cargar debe ser mayor a cero.', 'error');
      return;
    }

    const updated = restockProduct(selectedProduct.id, restockQty, restockUser);
    setProducts(updated);
    showToast(`Cargadas +${restockQty} unidades para "${selectedProduct.name}" con éxito.`);
    setIsRestockOpen(false);
  };

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast Alert popup */}
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

      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white mb-2 tracking-wide font-semibold">Control de Inventario & Stock</h1>
          <p className="text-gray-400 text-sm">Monitorea quiebres de stock, gestiona reposiciones inmediatas y analiza el consumo operativo de insumos y productos terminados.</p>
        </div>
      </div>

      {/* Analytics and Alert Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Analytics Card: Outputs (Salidas del Día) */}
        <div className="bg-charcoal-light/25 border border-charcoal-border rounded p-5 xl:col-span-1 shadow-lg flex flex-col justify-between hover:border-gold/20 transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Análisis de Salidas</span>
              <span className="text-[9px] bg-gold/10 text-gold px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {isUsingFallback ? 'Último Registro' : 'Hoy'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">Consumo y demanda de productos terminados {displayDateStr}.</p>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Producto Estrella</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h4 className="font-serif text-white text-md truncate max-w-[190px]" title={topProduct}>
                    {topProduct}
                  </h4>
                  <span className="text-gold font-bold text-xs">({topProductQty} un.)</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Stock Diario Consumido</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-serif text-white font-bold">{percentConsumed}%</span>
                  <div className="flex-1 h-1.5 bg-[#141414] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold rounded-full transition-all duration-500" 
                      style={{ width: `${percentConsumed}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-charcoal-border/50 pt-3 mt-4 flex justify-between items-center text-[10px] text-gray-500">
            <span>Demanda del turno: {totalUnitsSold} unidades vendidas</span>
            <TrendingUp className="w-3.5 h-3.5 text-gold" />
          </div>
        </div>

        {/* Alert Cards Grid (col-span-2) - Bento Grid horizontal de menor altura */}
        <div className="xl:col-span-2 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-full">
            
            {/* Stable */}
            <div 
              onClick={() => handleStatusFilterClick('stable')}
              className={`cursor-pointer rounded p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] md:col-span-2 ${
                statusFilter === 'stable'
                  ? 'bg-emerald-950/20 border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                  : 'bg-charcoal-light/10 border border-charcoal-border hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Estable</span>
                  <span className="text-[10px] text-gray-600">({'>'}= 8 un.)</span>
                </div>
              </div>
              <span className="text-2xl font-serif font-bold text-emerald-400">{estableCount}</span>
            </div>

            {/* Alert */}
            <div 
              onClick={() => handleStatusFilterClick('alert')}
              className={`cursor-pointer rounded p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] md:col-span-2 ${
                statusFilter === 'alert'
                  ? 'bg-yellow-950/20 border-yellow-500/70 shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30'
                  : 'bg-charcoal-light/10 border border-charcoal-border hover:border-yellow-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Alerta</span>
                  <span className="text-[10px] text-gray-600">(5 a 7 un.)</span>
                </div>
              </div>
              <span className="text-2xl font-serif font-bold text-yellow-400">{alertaCount}</span>
            </div>

            {/* Risk */}
            <div 
              onClick={() => handleStatusFilterClick('warning')}
              className={`cursor-pointer rounded p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] md:col-span-2 ${
                statusFilter === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                  : 'bg-charcoal-light/10 border border-charcoal-border hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Riesgo</span>
                  <span className="text-[10px] text-gray-600">(3 a 4 un.)</span>
                </div>
              </div>
              <span className="text-2xl font-serif font-bold text-amber-400">{riesgoCount}</span>
            </div>

            {/* Critical */}
            <div 
              onClick={() => handleStatusFilterClick('critical')}
              className={`cursor-pointer rounded p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] md:col-span-3 ${
                statusFilter === 'critical'
                  ? 'bg-orange-950/20 border-orange-500/70 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                  : 'bg-charcoal-light/10 border border-charcoal-border hover:border-orange-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-400 rounded">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Crítico</span>
                  <span className="text-[10px] text-gray-600">(1 a 2 un.)</span>
                </div>
              </div>
              <span className="text-2xl font-serif font-bold text-orange-400">{criticoCount}</span>
            </div>

            {/* Out of Stock */}
            <div 
              onClick={() => handleStatusFilterClick('out_of_stock')}
              className={`cursor-pointer rounded p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] md:col-span-3 ${
                statusFilter === 'out_of_stock'
                  ? 'bg-red-950/20 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30'
                  : 'bg-charcoal-light/10 border border-charcoal-border hover:border-red-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-400 rounded">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Quiebre</span>
                  <span className="text-[10px] text-gray-600">(0 un.)</span>
                </div>
              </div>
              <span className="text-2xl font-serif font-bold text-red-400">{sinStockCount}</span>
            </div>

          </div>
        </div>

      </div>

      {/* Filter and Search controls */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar producto por nombre..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-10 pr-4 py-2.5 text-xs rounded outline-none focus:border-gold/40 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* State select filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Filtrar por Estado:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
          >
            <option value="all">Ver Todos</option>
            <option value="stable">Estable ({'>'}= 8)</option>
            <option value="alert">Alerta (5 a 7)</option>
            <option value="warning">Riesgo (3 a 4)</option>
            <option value="critical">Crítico (1 a 2)</option>
            <option value="out_of_stock">Quiebre / Sin Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-charcoal-light/10 rounded border border-charcoal-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#0d0d0d]/80 text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
              <tr>
                <th className="px-6 py-4.5 w-80">Producto</th>
                <th className="px-6 py-4.5">Estado de Stock</th>
                <th className="px-6 py-4.5 text-center">Último Stock</th>
                <th className="px-6 py-4.5 text-center">Stock Actual</th>
                <th className="px-6 py-4.5 w-48">% Disp.</th>
                <th className="px-6 py-4.5">Última Carga</th>
                <th className="px-6 py-4.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-gray-500 bg-charcoal-light/5">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">No se encontraron productos</p>
                    <p className="text-[11px] text-gray-600">No hay elementos bajo este criterio de búsqueda o filtro</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const status = getStockStatus(p.stock);
                  
                  // % Available calculation relative to previousStock + lastRestockQty
                  const initialAvailable = (p.previousStock || 0) + (p.lastRestockQty || 0);
                  const percentAvailable = initialAvailable > 0
                    ? Math.min(100, Math.round((p.stock / initialAvailable) * 100))
                    : 100;

                  return (
                    <tr key={p.id} className="border-b border-charcoal-border/40 hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Name & image */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10 rounded overflow-hidden border border-charcoal-border bg-[#0d0d0d] shrink-0">
                            {p.image ? (
                              <Image src={p.image} alt={p.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <Layers className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-serif text-white text-sm font-medium block group-hover:text-gold transition-colors truncate max-w-[200px]">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">{p.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* Previous Stock */}
                      <td className="px-6 py-4.5 text-center font-bold text-gray-400">
                        {p.previousStock !== undefined ? `${p.previousStock} un.` : '--'}
                      </td>

                      {/* Current Stock */}
                      <td className="px-6 py-4.5 text-center">
                        <span className="font-bold text-white text-sm">{p.stock} un.</span>
                      </td>

                      {/* % Available Progress Bar */}
                      <td className="px-6 py-4.5">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                            <span>{percentAvailable}%</span>
                          </div>
                          <div className="w-full h-1 bg-[#141414] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
                              style={{ width: `${percentAvailable}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last restock history */}
                      <td className="px-6 py-4.5">
                        {p.lastRestockedAt ? (
                          <div className="text-[11px] text-gray-400 space-y-1">
                            <div className="flex items-center gap-1 font-semibold text-gold-hover">
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{p.lastRestockQty} un.</span>
                              <span className="text-gray-500 font-normal">por {p.lastRestockedBy}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-600">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(p.lastRestockedAt).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">Sin registros de carga</span>
                        )}
                      </td>

                      {/* Cargar Stock Action button */}
                      <td className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => handleOpenRestock(p)}
                          className="bg-gold/10 hover:bg-gold text-gold hover:text-black border border-gold/20 hover:border-gold px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                        >
                          Cargar Stock
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Dialog Popup */}
      {isRestockOpen && selectedProduct && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in"
            onClick={() => setIsRestockOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-charcoal-light border border-charcoal-border rounded-lg shadow-2xl z-[201] p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-charcoal-border mb-5">
              <div>
                <h3 className="font-serif text-lg text-white">Cargar Stock</h3>
                <p className="text-xs text-gray-500 mt-0.5">Incrementar stock físico para este producto.</p>
              </div>
              <button 
                onClick={() => setIsRestockOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-5">
              
              {/* Product preview */}
              <div className="flex items-center gap-4 bg-[#0d0d0d] p-3 rounded border border-charcoal-border/50">
                <div className="relative w-12 h-12 rounded overflow-hidden border border-charcoal-border shrink-0">
                  {selectedProduct.image ? (
                    <Image src={selectedProduct.image} alt={selectedProduct.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Layers className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-serif text-white font-semibold text-sm truncate max-w-[250px]">{selectedProduct.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Stock actual: <span className="font-bold text-white">{selectedProduct.stock} unidades</span></p>
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cantidad a Cargar</label>
                <input 
                  type="number"
                  min="1"
                  value={restockQty || ''}
                  onChange={(e) => setRestockQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                  required
                />
              </div>

              {/* User responsible selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Usuario Responsable</label>
                <select
                  value={restockUser}
                  onChange={(e) => setRestockUser(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                >
                  <option value="Panadero Jefe">Panadero Jefe (Producción)</option>
                  <option value="Encargado de Almacén">Encargado de Almacén (Logística)</option>
                  <option value="Usuario Administrador">Usuario Administrador (Gerencia)</option>
                  <option value="Control de Turno">Control de Turno (Operaciones)</option>
                </select>
              </div>

              {/* Future stock preview */}
              <div className="flex items-center justify-center gap-3 py-3 border-t border-b border-charcoal-border/50 text-xs text-gray-400">
                <span>{selectedProduct.stock} un.</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold" />
                <span className="font-bold text-white">{selectedProduct.stock + (restockQty || 0)} un. (Establecido)</span>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 border border-charcoal-border hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg transition-colors cursor-pointer"
                >
                  Confirmar Reposición
                </button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
