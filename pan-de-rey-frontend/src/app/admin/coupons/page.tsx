"use client";

import { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Percent, 
  DollarSign, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Info,
  Edit,
  Copy,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { formatPrice } from '@/utils/format';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: string;
  name: string;
  base_price: number;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_count: number;
  category_id: number | null;
  product_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: number;
}

export default function CouponsManagement() {
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percent' | 'fixed'>('all');
  
  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed'>('percent');
  const [newValue, setNewValue] = useState<number>(10);
  const [newMinPurchase, setNewMinPurchase] = useState<number>(0);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newStatus, setNewStatus] = useState<boolean>(true);
  const [newMaxUses, setNewMaxUses] = useState<number | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [selectedProductId, setSelectedProductId] = useState<string | ''>('');
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
    // Set default date to 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setNewExpiryDate(futureDate.toISOString().split('T')[0]);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coupRes, catRes, prodRes] = await Promise.all([
        fetch('/api/coupons'),
        fetch('/api/catalog/categories'),
        fetch('/api/catalog/products')
      ]);
      if (coupRes.ok) setCoupons(await coupRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con la base de datos de cupones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const isExpired = coupon.valid_to ? new Date(coupon.valid_to) < new Date() : false;
    if (isExpired) {
      showToast('No se puede activar un cupón expirado.', 'error');
      return;
    }
    const nextActive = coupon.is_active === 1 ? false : true;

    try {
      const res = await fetch('/api/coupons/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          minOrderValue: coupon.min_order_value,
          maxUses: coupon.max_uses,
          categoryId: coupon.category_id,
          productId: coupon.product_id,
          validTo: coupon.valid_to ? coupon.valid_to.split('T')[0] : null,
          isActive: nextActive
        })
      });

      if (res.ok) {
        showToast(`Cupón "${coupon.code}" marcado como ${nextActive ? 'Activo' : 'Inactivo'}.`);
        loadData();
      } else {
        showToast('Error al actualizar el estado del cupón.', 'error');
      }
    } catch (err) {
      showToast('Error de red al actualizar estado.', 'error');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (confirm(`¿Está seguro de desactivar/eliminar el cupón "${coupon.code}"?`)) {
      try {
        const res = await fetch('/api/coupons/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: coupon.id })
        });
        if (res.ok) {
          showToast(`Cupón "${coupon.code}" marcado como inactivo.`);
          loadData();
        } else {
          showToast('Error al eliminar cupón.', 'error');
        }
      } catch (err) {
        showToast('Error de red.', 'error');
      }
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setIsEditMode(true);
    setIsDuplicateMode(false);
    setEditingId(coupon.id);
    
    setNewCode(coupon.code);
    setNewType(coupon.discount_type as any);
    setNewValue(Number(coupon.discount_value));
    setNewMinPurchase(Number(coupon.min_order_value));
    setNewExpiryDate(coupon.valid_to ? coupon.valid_to.split('T')[0] : '');
    setNewStatus(coupon.is_active === 1);
    setNewMaxUses(coupon.max_uses ?? '');
    setSelectedCategoryId(coupon.category_id ?? '');
    setSelectedProductId(coupon.product_id ?? '');
    
    setIsDrawerOpen(true);
  };

  const handleDuplicate = (coupon: Coupon) => {
    setIsEditMode(false);
    setIsDuplicateMode(true);
    setEditingId(null);
    
    setNewCode(`${coupon.code}_NUEVO`);
    setNewType(coupon.discount_type as any);
    setNewValue(Number(coupon.discount_value));
    setNewMinPurchase(Number(coupon.min_order_value));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setNewExpiryDate(futureDate.toISOString().split('T')[0]);
    setNewStatus(true);
    setNewMaxUses(coupon.max_uses ?? '');
    setSelectedCategoryId(coupon.category_id ?? '');
    setSelectedProductId(coupon.product_id ?? '');
    
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setIsEditMode(false);
    setIsDuplicateMode(false);
    setEditingId(null);
    
    setNewCode('');
    setNewType('percent');
    setNewValue(10);
    setNewMinPurchase(0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setNewExpiryDate(futureDate.toISOString().split('T')[0]);
    setNewStatus(true);
    setNewMaxUses('');
    setSelectedCategoryId('');
    setSelectedProductId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      showToast('Por favor, ingrese un código para el cupón.', 'error');
      return;
    }
    if (newValue <= 0) {
      showToast('El valor del descuento debe ser mayor a cero.', 'error');
      return;
    }
    if (newType === 'percent' && newValue > 100) {
      showToast('El porcentaje de descuento no puede superar el 100%.', 'error');
      return;
    }
    if (newMinPurchase < 0) {
      showToast('La compra mínima no puede ser menor a cero.', 'error');
      return;
    }

    const payload = {
      id: editingId,
      code: newCode.trim().toUpperCase(),
      discountType: newType,
      discountValue: newValue,
      minOrderValue: newMinPurchase,
      maxUses: newMaxUses === '' ? null : Number(newMaxUses),
      categoryId: selectedCategoryId === '' ? null : Number(selectedCategoryId),
      productId: selectedProductId === '' ? null : selectedProductId,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: newExpiryDate || null,
      isActive: newStatus
    };

    try {
      const url = isEditMode ? '/api/coupons/update' : '/api/coupons';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(isEditMode ? 'Cupón actualizado correctamente.' : 'Cupón creado correctamente.');
        handleCloseDrawer();
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al guardar el cupón.', 'error');
      }
    } catch (err) {
      showToast('Error de red al guardar el cupón.', 'error');
    }
  };

  const getCategoryName = (id: number | null) => {
    if (!id) return '';
    return categories.find(c => c.id === id)?.name || `Categoría #${id}`;
  };

  const getProductName = (id: string | null) => {
    if (!id) return '';
    return products.find(p => p.id === id)?.name || `Producto #${id.substring(0, 8)}`;
  };

  // Filtered coupons list
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && c.is_active === 1) || 
      (statusFilter === 'inactive' && c.is_active === 0);
    const matchesType = typeFilter === 'all' || c.discount_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!mounted) return null;

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
      <div className="flex justify-between items-center bg-charcoal-light/35 p-4 rounded-xl border border-charcoal-border shadow-lg">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-wide font-semibold">Configuración de Cupones de Descuento</h1>
          <p className="text-gray-400 text-xs mt-1">Conectado a Supabase. Configura cupones porcentuales o fijos aplicables al carrito.</p>
        </div>
        <button
          onClick={() => {
            setIsEditMode(false);
            setIsDuplicateMode(false);
            setIsDrawerOpen(true);
          }}
          className="bg-gold hover:bg-gold-hover text-black px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-colors cursor-pointer border-none font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Cupón
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por código de cupón..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-9 pr-4 py-2 text-xs rounded outline-none focus:border-gold/40"
          />
        </div>

        {/* State filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Estado:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2 rounded outline-none"
            >
              <option value="all">Ver Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Tipo:</span>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2 rounded outline-none"
            >
              <option value="all">Todos los Tipos</option>
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto Fijo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-[#111] rounded-xl border border-charcoal-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0d0d0d]/80 text-[9px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
              <tr>
                <th className="px-6 py-4.5 w-48">Código</th>
                <th className="px-6 py-4.5">Descuento</th>
                <th className="px-6 py-4.5 text-center">Usos / Límite</th>
                <th className="px-6 py-4.5 text-center">Mínimo Compra</th>
                <th className="px-6 py-4.5">Restricción Catálogo</th>
                <th className="px-6 py-4.5">Vence</th>
                <th className="px-6 py-4.5 text-center">Estado</th>
                <th className="px-6 py-4.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-border/30">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-20 text-gray-500">Cargando cupones reales...</td></tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-500 bg-charcoal-light/5">
                    <Ticket className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">No se encontraron cupones</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isExpired = c.valid_to ? new Date(c.valid_to) < new Date() : false;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                      
                      <td className="px-6 py-4 font-bold tracking-wider font-mono text-white text-xs">
                        <span className="bg-[#0d0d0d] px-2 py-1 rounded border border-charcoal-border text-gold-hover shadow-sm">
                          {c.code}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-white font-bold text-sm">
                          {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${formatPrice(Number(c.discount_value))}`}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase block font-bold mt-0.5">
                          {c.discount_type === 'percent' ? 'Porcentual' : 'Monto Fijo'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-mono font-bold">
                          {c.uses_count} <span className="text-gray-600">/</span> {c.max_uses ? c.max_uses : '∞'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-semibold font-mono">
                          ${formatPrice(Number(c.min_order_value))}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {c.category_id ? (
                          <div className="flex items-center gap-1 text-[10px] text-gold-hover">
                            <Layers className="w-3.5 h-3.5 text-gold/60" />
                            <span>Categoría: {getCategoryName(c.category_id)}</span>
                          </div>
                        ) : c.product_id ? (
                          <div className="flex items-center gap-1 text-[10px] text-blue-400">
                            <ShoppingBag className="w-3.5 h-3.5 text-blue-500/50" />
                            <span className="truncate max-w-[150px]">Producto: {getProductName(c.product_id)}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">Toda la Tienda</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span className={isExpired ? 'text-red-400 line-through' : ''}>
                            {c.valid_to ? new Date(c.valid_to).toLocaleDateString('es-ES') : 'Sin expiración'}
                          </span>
                          {isExpired && (
                            <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-black uppercase">Expirado</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`focus:outline-none bg-transparent border-none cursor-pointer ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isExpired}
                        >
                          {c.is_active === 1 && !isExpired ? (
                            <span className="px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider text-emerald-400 border-emerald-500/20 bg-emerald-500/5">Activo</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider text-red-400 border-red-500/20 bg-red-500/5">Inactivo</span>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(c)} className="text-gray-500 hover:text-gold p-1 hover:bg-white/5 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDuplicate(c)} className="text-gray-500 hover:text-blue-400 p-1 hover:bg-white/5 rounded"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(c)} className="text-gray-500 hover:text-red-400 p-1 hover:bg-white/5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Form (Crear / Editar) */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" onClick={handleCloseDrawer} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-charcoal-light border-l border-charcoal-border shadow-2xl z-[201] flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="h-20 flex justify-between items-center px-6 border-b border-charcoal-border bg-[#070707]">
              <div>
                <h3 className="font-serif text-lg text-white font-semibold">
                  {isEditMode ? 'Editar Cupón' : isDuplicateMode ? 'Replicar Cupón' : 'Nuevo Cupón'}
                </h3>
              </div>
              <button onClick={handleCloseDrawer} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Código</label>
                <input 
                  type="text"
                  placeholder="Ej. PAN15OFF"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2 rounded font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Tipo de Descuento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setNewType('percent'); setNewValue(15); }}
                    className={`py-2.5 rounded border text-xs font-bold uppercase ${newType === 'percent' ? 'bg-gold/10 border-gold text-gold' : 'bg-[#0d0d0d] border-charcoal-border text-gray-400'}`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewType('fixed'); setNewValue(2000); }}
                    className={`py-2.5 rounded border text-xs font-bold uppercase ${newType === 'fixed' ? 'bg-gold/10 border-gold text-gold' : 'bg-[#0d0d0d] border-charcoal-border text-gray-400'}`}
                  >
                    Monto Fijo ($)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Valor Descuento</label>
                <input 
                  type="number"
                  min="1"
                  value={newValue || ''}
                  onChange={(e) => setNewValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2 rounded"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Monto Mínimo Compra</label>
                <input 
                  type="number"
                  min="0"
                  value={newMinPurchase}
                  onChange={(e) => setNewMinPurchase(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2 rounded"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Límite Usos Totales</label>
                <input 
                  type="number"
                  placeholder="Sin límite (dejar vacío)"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2 rounded"
                />
              </div>

              {/* Category Restriction */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Restricción de Categoría (Opcional)</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value === '' ? '' : Number(e.target.value));
                    setSelectedProductId(''); // Clear product if category is selected
                  }}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2 rounded"
                >
                  <option value="">Aplica a todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Restriction */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Restricción de Producto (Opcional)</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedCategoryId(''); // Clear category if product is selected
                  }}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2 rounded"
                >
                  <option value="">Aplica a todos los productos</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Fecha Expiración</label>
                <input 
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2 rounded"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Estado Inicial</label>
                <div className="flex items-center justify-between bg-[#0d0d0d] p-3 rounded border border-charcoal-border/50">
                  <span className="text-xs text-gray-400">Activar cupón inmediatamente</span>
                  <button
                    type="button"
                    onClick={() => setNewStatus(!newStatus)}
                    className="text-gold bg-transparent border-none cursor-pointer"
                  >
                    {newStatus ? <ToggleRight className="w-8 h-8 text-gold" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
                  </button>
                </div>
              </div>

              <div className="bg-[#121008]/40 border border-gold/15 p-4 rounded text-xs text-gray-400">
                <div className="flex items-center gap-1.5 text-gold font-bold uppercase text-[9px] mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Resumen del Cupón</span>
                </div>
                <p>El código {newCode.trim().toUpperCase() || 'N/A'} otorgará {newType === 'percent' ? `${newValue}%` : `$${formatPrice(newValue)}`} de descuento.</p>
                {newMinPurchase > 0 && <p>Aplica para compras desde ${formatPrice(newMinPurchase)}.</p>}
                {selectedCategoryId && <p>Restringido a la categoría: {getCategoryName(Number(selectedCategoryId))}.</p>}
                {selectedProductId && <p>Restringido al producto: {getProductName(selectedProductId)}.</p>}
              </div>

              <div className="flex gap-3 pt-4 border-t border-charcoal-border/50">
                <button type="button" onClick={handleCloseDrawer} className="flex-1 py-2.5 border border-charcoal-border text-gray-400 text-xs font-bold uppercase rounded">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded">Guardar Cupón</button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
