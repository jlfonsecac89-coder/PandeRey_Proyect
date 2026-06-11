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
  Mail,
  Layers,
  ShoppingBag,
  Check
} from 'lucide-react';
import { 
  getLocalCoupons, 
  addLocalCoupon, 
  deleteLocalCoupon, 
  updateLocalCouponStatus, 
  updateLocalCoupon,
  getLocalProducts, 
  SimCoupon,
  SimProduct
} from '@/utils/dbSim';
import { formatPrice } from '@/utils/format';

export default function CouponsManagement() {
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<SimCoupon[]>([]);
  const [allProducts, setAllProducts] = useState<SimProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percent' | 'fixed'>('all');
  
  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [editingCode, setEditingCode] = useState('');

  // Form Fields
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed'>('percent');
  const [newValue, setNewValue] = useState<number>(10);
  const [newMinPurchase, setNewMinPurchase] = useState<number>(0);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newOnlyOncePerEmail, setNewOnlyOncePerEmail] = useState(false);
  const [newMaxUses, setNewMaxUses] = useState<number | ''>('');
  const [newMaxDiscountAmount, setNewMaxDiscountAmount] = useState<number | ''>('');
  const [newLimitProductIds, setNewLimitProductIds] = useState<number[]>([]);
  const [newLimitCategories, setNewLimitCategories] = useState<string[]>([]);
  const [newLimitSubCategories, setNewLimitSubCategories] = useState<string[]>([]);
  
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

  const loadData = () => {
    setCoupons(getLocalCoupons());
    setAllProducts(getLocalProducts());
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = (code: string, currentStatus: 'active' | 'inactive', isExpired: boolean) => {
    if (isExpired) {
      showToast('No se puede activar un cupón expirado. Por favor, replíquelo duplicándolo.', 'error');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const updated = updateLocalCouponStatus(code, nextStatus);
    setCoupons(updated);
    showToast(`Cupón "${code}" marcado como ${nextStatus === 'active' ? 'Activo' : 'Inactivo'}.`);
  };

  const handleDelete = (code: string) => {
    if (confirm(`¿Está seguro de eliminar el cupón "${code}"?`)) {
      const updated = deleteLocalCoupon(code);
      setCoupons(updated);
      showToast(`Cupón "${code}" eliminado con éxito.`);
    }
  };

  const handleEdit = (coupon: SimCoupon) => {
    setIsEditMode(true);
    setIsDuplicateMode(false);
    setEditingCode(coupon.code);
    
    setNewCode(coupon.code);
    setNewType(coupon.type);
    setNewValue(coupon.value);
    setNewMinPurchase(coupon.minPurchase);
    setNewExpiryDate(coupon.expiryDate);
    setNewStatus(coupon.status);
    setNewOnlyOncePerEmail(coupon.onlyOncePerEmail || false);
    setNewMaxUses(coupon.maxUses ?? '');
    setNewMaxDiscountAmount(coupon.maxDiscountAmount ?? '');
    setNewLimitProductIds(coupon.limitProductIds || []);
    setNewLimitCategories(coupon.limitCategories || []);
    setNewLimitSubCategories(coupon.limitSubCategories || []);
    
    setIsDrawerOpen(true);
  };

  const handleDuplicate = (coupon: SimCoupon) => {
    setIsEditMode(false);
    setIsDuplicateMode(true);
    setEditingCode('');
    
    setNewCode(`${coupon.code}_NUEVO`);
    setNewType(coupon.type);
    setNewValue(coupon.value);
    setNewMinPurchase(coupon.minPurchase);
    // Suggest new expiry date (30 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setNewExpiryDate(futureDate.toISOString().split('T')[0]);
    setNewStatus('active');
    setNewOnlyOncePerEmail(coupon.onlyOncePerEmail || false);
    setNewMaxUses(coupon.maxUses ?? '');
    setNewMaxDiscountAmount(coupon.maxDiscountAmount ?? '');
    setNewLimitProductIds(coupon.limitProductIds || []);
    setNewLimitCategories(coupon.limitCategories || []);
    setNewLimitSubCategories(coupon.limitSubCategories || []);
    
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setIsEditMode(false);
    setIsDuplicateMode(false);
    setEditingCode('');
    
    // Reset form
    setNewCode('');
    setNewType('percent');
    setNewValue(10);
    setNewMinPurchase(0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setNewExpiryDate(futureDate.toISOString().split('T')[0]);
    setNewStatus('active');
    setNewOnlyOncePerEmail(false);
    setNewMaxUses('');
    setNewMaxDiscountAmount('');
    setNewLimitProductIds([]);
    setNewLimitCategories([]);
    setNewLimitSubCategories([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    if (!newExpiryDate) {
      showToast('Por favor, seleccione una fecha de expiración.', 'error');
      return;
    }

    const isExpired = new Date(newExpiryDate + 'T23:59:59') < new Date();
    const finalStatus = isExpired ? 'inactive' : newStatus;

    const couponData: SimCoupon = {
      code: newCode.trim().toUpperCase(),
      type: newType,
      value: newValue,
      minPurchase: newMinPurchase,
      expiryDate: newExpiryDate,
      status: finalStatus,
      createdAt: isEditMode 
        ? (coupons.find(c => c.code === editingCode)?.createdAt || new Date().toISOString().split('T')[0]) 
        : new Date().toISOString().split('T')[0],
      usedCount: isEditMode 
        ? (coupons.find(c => c.code === editingCode)?.usedCount || 0) 
        : 0,
      onlyOncePerEmail: newOnlyOncePerEmail,
      maxUses: newMaxUses === '' ? null : Number(newMaxUses),
      maxDiscountAmount: newMaxDiscountAmount === '' ? null : Number(newMaxDiscountAmount),
      limitProductIds: newLimitProductIds,
      limitCategories: newLimitCategories,
      limitSubCategories: newLimitSubCategories
    };

    try {
      let updated: SimCoupon[];
      if (isEditMode) {
        updated = updateLocalCoupon(editingCode, couponData);
        showToast(`Cupón "${couponData.code}" actualizado con éxito.`);
      } else {
        updated = addLocalCoupon(couponData);
        showToast(`Cupón "${couponData.code}" creado con éxito.`);
      }
      setCoupons(updated);
      handleCloseDrawer();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar el cupón.', 'error');
    }
  };

  if (!mounted) return null;

  // Filtered coupons
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // KPI calculations
  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter(c => {
    const isExpired = new Date(c.expiryDate + 'T23:59:59') < new Date();
    return c.status === 'active' && !isExpired;
  }).length;
  
  // Average percentage discount for active percentage coupons
  const activePercentCoupons = coupons.filter(c => {
    const isExpired = new Date(c.expiryDate + 'T23:59:59') < new Date();
    return c.type === 'percent' && c.status === 'active' && !isExpired;
  });
  const avgPercentDiscount = activePercentCoupons.length > 0
    ? Math.round(activePercentCoupons.reduce((sum, c) => sum + c.value, 0) / activePercentCoupons.length)
    : 0;

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast popup */}
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
          <p className="text-gray-400 text-xs mt-1">Define condiciones, vigencias, limitaciones de catálogo y topes de descuento.</p>
        </div>
        <button
          onClick={() => {
            setIsEditMode(false);
            setIsDuplicateMode(false);
            setIsDrawerOpen(true);
          }}
          className="bg-gold hover:bg-gold-hover text-black px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 shadow-lg transition-colors cursor-pointer border-none outline-none font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Cupón
        </button>
      </div>

      {/* KPI Cards Bento Grid - Interactive Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI: Active Coupons */}
        <div 
          onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
          className={`cursor-pointer rounded-xl p-5 flex items-center justify-between shadow-lg transition-all duration-300 border ${
            statusFilter === 'active' 
              ? 'bg-[#121c16]/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.02]' 
              : 'bg-charcoal-light/25 border-charcoal-border hover:border-emerald-500/35'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Cupones Activos</span>
              <span className="text-xs text-gray-500">Filtrar activos hoy</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-emerald-400">{activeCouponsCount}</span>
        </div>

        {/* KPI: Total Coupons */}
        <div 
          onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
          className={`cursor-pointer rounded-xl p-5 flex items-center justify-between shadow-lg transition-all duration-300 border ${
            statusFilter === 'all' && typeFilter === 'all'
              ? 'bg-charcoal-light/45 border-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] scale-[1.02]'
              : 'bg-charcoal-light/25 border-charcoal-border hover:border-gold/30'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 text-gold rounded-lg">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Total Cupones</span>
              <span className="text-xs text-gray-500">Remover filtros</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-white">{totalCouponsCount}</span>
        </div>

        {/* KPI: Average Discount */}
        <div 
          onClick={() => setTypeFilter(prev => prev === 'percent' ? 'all' : 'percent')}
          className={`cursor-pointer rounded-xl p-5 flex items-center justify-between shadow-lg transition-all duration-300 border ${
            typeFilter === 'percent'
              ? 'bg-charcoal-light/45 border-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] scale-[1.02]'
              : 'bg-charcoal-light/25 border-charcoal-border hover:border-gold/30'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 text-gold rounded-lg">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Descuento Promedio</span>
              <span className="text-xs text-gray-500">Filtrar por porcentuales</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-gold-hover">{avgPercentDiscount}%</span>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded-xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por código de cupón..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-10 pr-4 py-2.5 text-xs rounded-lg outline-none focus:border-gold/40 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2 animate-in fade-in"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* State select filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Estado:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors cursor-pointer"
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
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors cursor-pointer"
            >
              <option value="all">Todos los Tipos</option>
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto Fijo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-[#111] rounded-xl border border-charcoal-border overflow-hidden shadow-2xl animate-in fade-in duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0d0d0d]/80 text-[9px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
              <tr>
                <th className="px-6 py-4.5 w-48">Código</th>
                <th className="px-6 py-4.5">Tipo / Valor</th>
                <th className="px-6 py-4.5 text-center">Usos / Límite</th>
                <th className="px-6 py-4.5 text-center">Tope Descuento</th>
                <th className="px-6 py-4.5">Restricciones Catálogo</th>
                <th className="px-6 py-4.5">Email Único / Vence</th>
                <th className="px-6 py-4.5 text-center">Estado</th>
                <th className="px-6 py-4.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-border/30">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-500 bg-charcoal-light/5">
                    <Ticket className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">No se encontraron cupones</p>
                    <p className="text-[11px] text-gray-600">No hay elementos bajo este criterio de búsqueda o filtro</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isExpired = new Date(c.expiryDate + 'T23:59:59') < new Date();
                  const hasCatalogLimits = !!(c.limitProductIds?.length || c.limitCategories?.length || c.limitSubCategories?.length);
                  
                  return (
                    <tr key={c.code} className="hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Code */}
                      <td className="px-6 py-4.5 font-bold tracking-wider font-mono text-white text-xs">
                        <span className="bg-[#0d0d0d] px-2.5 py-1 rounded border border-charcoal-border text-gold-hover shadow-sm">
                          {c.code}
                        </span>
                      </td>

                      {/* Type / Value */}
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-bold text-sm">
                            {c.type === 'percent' ? `${c.value}%` : `$${formatPrice(c.value)}`}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1 font-bold">
                            {c.type === 'percent' ? <Percent className="w-2.5 h-2.5" /> : <DollarSign className="w-2.5 h-2.5" />}
                            {c.type === 'percent' ? 'Porcentual' : 'Fijo'}
                          </span>
                        </div>
                      </td>

                      {/* Uses / Limit */}
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-mono font-bold text-xs">
                            {c.usedCount} <span className="text-gray-600">/</span> {c.maxUses ? c.maxUses : '∞'}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                            Usos Totales
                          </span>
                        </div>
                      </td>

                      {/* Max Discount Amount */}
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-semibold font-mono">
                            {c.maxDiscountAmount ? `$${formatPrice(c.maxDiscountAmount)}` : 'Sin tope'}
                          </span>
                          {c.minPurchase > 0 && (
                            <span className="text-[9px] text-gray-500 font-mono">
                              Mínimo: ${formatPrice(c.minPurchase)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Catalog Restrictions */}
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {!hasCatalogLimits ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">
                              Toda la Tienda
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {c.limitCategories && c.limitCategories.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-gold-hover">
                                  <Layers className="w-3 h-3 text-gold/60 shrink-0" />
                                  <span className="truncate" title={c.limitCategories.join(', ')}>
                                    Cats: {c.limitCategories.join(', ')}
                                  </span>
                                </div>
                              )}
                              {c.limitSubCategories && c.limitSubCategories.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <Layers className="w-3 h-3 text-gray-600 shrink-0" />
                                  <span className="truncate" title={c.limitSubCategories.join(', ')}>
                                    Subs: {c.limitSubCategories.join(', ')}
                                  </span>
                                </div>
                              )}
                              {c.limitProductIds && c.limitProductIds.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-blue-400">
                                  <ShoppingBag className="w-3 h-3 text-blue-500/50 shrink-0" />
                                  <span>{c.limitProductIds.length} prods.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiry & Email limit */}
                      <td className="px-6 py-4.5 text-xs text-gray-400">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-gray-500 text-[10px] font-bold">
                            <Mail className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                            <span>Unico Email:</span>
                            <span className={c.onlyOncePerEmail ? 'text-gold-hover' : 'text-gray-500'}>
                              {c.onlyOncePerEmail ? 'Sí' : 'No'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <span className={isExpired ? 'text-red-400 line-through' : ''}>
                              {new Date(c.expiryDate + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                            </span>
                            {isExpired && (
                              <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-black uppercase tracking-wider">
                                Vencido
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(c.code, c.status, isExpired)}
                          className={`focus:outline-none bg-transparent border-none cursor-pointer p-0 ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isExpired ? 'No se puede activar un cupón expirado' : 'Click para cambiar estado'}
                          disabled={isExpired}
                        >
                          {c.status === 'active' && !isExpired ? (
                            <span className="px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="text-gray-500 hover:text-gold p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer bg-transparent border-none"
                            title="Editar Cupón"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDuplicate(c)}
                            className="text-gray-500 hover:text-blue-400 p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer bg-transparent border-none"
                            title="Duplicar / Replicar Cupón"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(c.code)}
                            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer bg-transparent border-none"
                            title="Eliminar Cupón"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Drawer Lateral Derecho (Crear / Editar / Duplicar) */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in"
            onClick={handleCloseDrawer}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-charcoal-light border-l border-charcoal-border shadow-2xl z-[201] flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="h-20 flex justify-between items-center px-6 border-b border-charcoal-border bg-[#070707]">
              <div>
                <h3 className="font-serif text-lg text-white font-semibold">
                  {isEditMode ? `Editar Cupón: ${editingCode}` : isDuplicateMode ? `Replicar Cupón: ${editingCode}` : 'Nuevo Cupón de Descuento'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isEditMode ? 'Actualiza los parámetros comerciales de la campaña.' : isDuplicateMode ? 'Crea una nueva promoción clonando los filtros y topes.' : 'Crea un nuevo beneficio promocional.'}
                </p>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="text-gray-400 hover:text-white p-1.5 hover:bg-white/5 rounded-full transition-colors cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              
              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Código del Cupón</label>
                <input 
                  type="text"
                  placeholder="Ej: MASAMADRE20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors font-mono uppercase"
                  required
                />
                <span className="text-[10px] text-gray-500 block">El código se autocompletará en mayúsculas al guardar.</span>
              </div>

              {/* Discount Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Tipo de Descuento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setNewType('percent'); setNewValue(10); }}
                    className={`py-3 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newType === 'percent'
                        ? 'bg-gold/10 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.05)]'
                        : 'bg-[#0d0d0d] border-charcoal-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    Porcentaje
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewType('fixed'); setNewValue(1000); }}
                    className={`py-3 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newType === 'fixed'
                        ? 'bg-gold/10 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.05)]'
                        : 'bg-[#0d0d0d] border-charcoal-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Monto Fijo
                  </button>
                </div>
              </div>

              {/* Value */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                  {newType === 'percent' ? 'Porcentaje de Descuento (%)' : 'Monto de Descuento ($)'}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    max={newType === 'percent' ? 100 : 999999}
                    value={newValue || ''}
                    onChange={(e) => setNewValue(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors pl-8"
                    required
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    {newType === 'percent' ? <Percent className="w-3.5 h-3.5" /> : <span className="text-xs">$</span>}
                  </div>
                </div>
              </div>

              {/* Limit Rules: Checkbox & Caps Grid */}
              <div className="border-t border-charcoal-border/50 pt-4 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold">Límites y Controles de Uso</h4>

                {/* Email Single Use Checkbox */}
                <label className="flex items-center gap-3 bg-[#0d0d0d] border border-charcoal-border/50 p-3 rounded-lg cursor-pointer hover:border-gold/20 transition-colors">
                  <input 
                    type="checkbox"
                    checked={newOnlyOncePerEmail}
                    onChange={(e) => setNewOnlyOncePerEmail(e.target.checked)}
                    className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-4 h-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-white font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gold/80" />
                      Uso Único por Email
                    </span>
                    <span className="text-[9px] text-gray-500">El cliente solo puede canjear el cupón una vez por su cuenta.</span>
                  </div>
                </label>

                {/* Caps Grid (Max Uses & Max Discount Amount) */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Max Uses */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Límite Usos Totales</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="Sin límite"
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors"
                    />
                    <span className="text-[8px] text-gray-500 block">Cap de usos globales.</span>
                  </div>

                  {/* Max Discount Amount */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Tope Descuento ($)</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="Sin tope"
                      value={newMaxDiscountAmount}
                      onChange={(e) => setNewMaxDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors"
                    />
                    <span className="text-[8px] text-gray-500 block">Tope máximo en CLP.</span>
                  </div>

                </div>

                {/* Minimum Purchase */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Compra Mínima Requerida ($)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="0"
                      value={newMinPurchase}
                      onChange={(e) => setNewMinPurchase(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors pl-8"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <span className="text-xs">$</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Fecha de Expiración</label>
                <input 
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors font-sans"
                  required
                />
              </div>

              {/* Catalog Restrictions Segment */}
              <div className="border-t border-charcoal-border/50 pt-4 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Restricciones de Catálogo
                </h4>

                {/* Limit Categories */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Restringir por Categoría</label>
                  <div className="bg-[#0d0d0d] border border-charcoal-border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 scrollbar-thin">
                    {['Panadería', 'Pastelería', 'Sin Gluten', 'Bebestibles'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={newLimitCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewLimitCategories(prev => [...prev, cat]);
                            } else {
                              setNewLimitCategories(prev => prev.filter(c => c !== cat));
                            }
                          }}
                          className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Limit Subcategories */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Restringir por Subcategoría</label>
                  <div className="bg-[#0d0d0d] border border-charcoal-border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 scrollbar-thin">
                    {['Masa Madre', 'Especialidades', 'Rústicos', 'Centeno', 'Hojaldres', 'Tartas', 'Brioche', 'Dulces', 'Panes', 'Galletas', 'Cafetería Caliente'].map(sub => (
                      <label key={sub} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={newLimitSubCategories.includes(sub)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewLimitSubCategories(prev => [...prev, sub]);
                            } else {
                              setNewLimitSubCategories(prev => prev.filter(s => s !== sub));
                            }
                          }}
                          className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                        />
                        {sub}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Limit Products */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Restringir por Producto</label>
                  <div className="bg-[#0d0d0d] border border-charcoal-border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2 scrollbar-thin">
                    {allProducts.map(prod => (
                      <label key={prod.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={newLimitProductIds.includes(prod.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewLimitProductIds(prev => [...prev, prod.id]);
                            } else {
                              setNewLimitProductIds(prev => prev.filter(id => id !== prod.id));
                            }
                          }}
                          className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="truncate">{prod.name} (${formatPrice(prod.price)})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Initial Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Estado Inicial</label>
                <div className="flex items-center justify-between bg-[#0d0d0d] p-3.5 rounded-lg border border-charcoal-border/50">
                  <span className="text-xs text-gray-400 font-medium">Activar cupón inmediatamente</span>
                  <button
                    type="button"
                    onClick={() => setNewStatus(newStatus === 'active' ? 'inactive' : 'active')}
                    className="text-gold focus:outline-none transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {newStatus === 'active' ? (
                      <ToggleRight className="w-9 h-9 stroke-[1.5]" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 stroke-[1.5] text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Preview of Coupon benefits */}
              <div className="bg-[#121008]/40 border border-gold/15 p-4 rounded-lg text-xs space-y-2 text-gray-400 shadow-inner">
                <div className="flex items-center gap-2 text-gold font-bold uppercase tracking-widest text-[9px] mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Resumen del Beneficio</span>
                </div>
                <p>
                  El código <span className="font-mono font-bold text-white">{newCode.trim().toUpperCase() || 'N/A'}</span> otorgará un descuento de <span className="font-bold text-white">{newType === 'percent' ? `${newValue}%` : `$${formatPrice(newValue)}`}</span>.
                </p>
                {newMaxDiscountAmount !== '' && (
                  <p>El descuento tendrá un tope máximo de <span className="font-bold text-white">${formatPrice(Number(newMaxDiscountAmount))}</span>.</p>
                )}
                {newMinPurchase > 0 ? (
                  <p>Aplica para compras desde <span className="font-bold text-white">${formatPrice(newMinPurchase)}</span>.</p>
                ) : (
                  <p>No requiere monto mínimo de compra.</p>
                )}
                {newMaxUses !== '' && (
                  <p>Limitado a un máximo de <span className="font-bold text-white">{newMaxUses} usos</span> totales.</p>
                )}
                {newOnlyOncePerEmail && (
                  <p>El cupón es de <span className="font-bold text-gold-hover">uso único por dirección de correo</span>.</p>
                )}
                {(newLimitCategories.length > 0 || newLimitSubCategories.length > 0 || newLimitProductIds.length > 0) ? (
                  <p className="text-gold-hover">Aplica únicamente sobre las categorías, subcategorías o productos específicos seleccionados.</p>
                ) : (
                  <p>Aplica para todos los productos de la tienda.</p>
                )}
                <p>
                  Válido hasta el <span className="font-bold text-white">
                    {newExpiryDate ? new Date(newExpiryDate + 'T12:00:00').toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>.
                </p>
              </div>

              {/* Form Actions footer */}
              <div className="flex gap-3 pt-4 border-t border-charcoal-border/50">
                <button 
                  type="button"
                  onClick={handleCloseDrawer}
                  className="flex-1 py-3 border border-charcoal-border hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase tracking-widest rounded-lg shadow-lg transition-colors cursor-pointer border-none outline-none font-sans"
                >
                  Guardar Cupón
                </button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
