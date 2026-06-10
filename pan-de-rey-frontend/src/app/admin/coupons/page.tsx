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
  Info
} from 'lucide-react';
import { 
  getLocalCoupons, 
  addLocalCoupon, 
  deleteLocalCoupon, 
  updateLocalCouponStatus, 
  SimCoupon 
} from '@/utils/dbSim';
import { formatPrice } from '@/utils/format';

export default function CouponsManagement() {
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<SimCoupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed'>('percent');
  const [newValue, setNewValue] = useState<number>(10);
  const [newMinPurchase, setNewMinPurchase] = useState<number>(0);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  
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
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = (code: string, currentStatus: 'active' | 'inactive') => {
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

    const couponData: SimCoupon = {
      code: newCode.trim().toUpperCase(),
      type: newType,
      value: newValue,
      minPurchase: newMinPurchase,
      expiryDate: newExpiryDate,
      status: newStatus
    };

    try {
      const updated = addLocalCoupon(couponData);
      setCoupons(updated);
      showToast(`Cupón "${couponData.code}" creado con éxito.`);
      
      // Reset form (except date defaults)
      setNewCode('');
      setNewType('percent');
      setNewValue(10);
      setNewMinPurchase(0);
      setNewStatus('active');
      setIsDrawerOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar el cupón.', 'error');
    }
  };

  if (!mounted) return null;

  // Filtered coupons
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter(c => c.status === 'active').length;
  
  // Average percentage discount for active percentage coupons
  const activePercentCoupons = coupons.filter(c => c.type === 'percent' && c.status === 'active');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white mb-2 tracking-wide font-semibold">Gestión de Cupones</h1>
          <p className="text-gray-400 text-sm">Crea, modifica y gestiona códigos de descuento para campañas de marketing y fidelización de clientes.</p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-gold hover:bg-gold-hover text-black px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 shadow-lg transition-colors cursor-pointer border-none outline-none font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Cupón
        </button>
      </div>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI: Active Coupons */}
        <div className="bg-[#121c16]/20 border border-emerald-500/15 rounded p-5 flex items-center justify-between shadow-lg hover:border-emerald-500/25 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Cupones Activos</span>
              <span className="text-xs text-gray-500">Campañas activas hoy</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-emerald-400">{activeCouponsCount}</span>
        </div>

        {/* KPI: Total Coupons */}
        <div className="bg-charcoal-light/25 border border-charcoal-border rounded p-5 flex items-center justify-between shadow-lg hover:border-gold/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 text-gold rounded">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Total Cupones</span>
              <span className="text-xs text-gray-500">Historial de códigos creados</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-white">{totalCouponsCount}</span>
        </div>

        {/* KPI: Average Discount */}
        <div className="bg-charcoal-light/25 border border-charcoal-border rounded p-5 flex items-center justify-between shadow-lg hover:border-gold/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 text-gold rounded">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Descuento Promedio</span>
              <span className="text-xs text-gray-500">De cupones porcentuales activos</span>
            </div>
          </div>
          <span className="text-3xl font-serif font-bold text-gold-hover">{avgPercentDiscount}%</span>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por código de cupón..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-10 pr-4 py-2.5 text-xs rounded outline-none focus:border-gold/40 transition-colors"
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

        {/* State select filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Filtrar por Estado:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
          >
            <option value="all">Ver Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-charcoal-light/10 rounded border border-charcoal-border overflow-hidden shadow-2xl animate-in fade-in duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#0d0d0d]/80 text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
              <tr>
                <th className="px-6 py-4.5 w-60">Código</th>
                <th className="px-6 py-4.5">Tipo de Descuento</th>
                <th className="px-6 py-4.5 text-center">Valor Descuento</th>
                <th className="px-6 py-4.5 text-center">Compra Mínima</th>
                <th className="px-6 py-4.5">Fecha de Expiración</th>
                <th className="px-6 py-4.5">Estado</th>
                <th className="px-6 py-4.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-gray-500 bg-charcoal-light/5">
                    <Ticket className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">No se encontraron cupones</p>
                    <p className="text-[11px] text-gray-600">No hay elementos bajo este criterio de búsqueda o filtro</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isExpired = new Date(c.expiryDate + 'T23:59:59') < new Date();
                  
                  return (
                    <tr key={c.code} className="border-b border-charcoal-border/40 hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Code */}
                      <td className="px-6 py-4.5 font-bold tracking-wider font-mono text-white text-sm">
                        <span className="bg-[#0d0d0d] px-2.5 py-1 rounded border border-charcoal-border text-gold-hover shadow-sm">
                          {c.code}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4.5 text-xs text-gray-400">
                        {c.type === 'percent' ? (
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-gold" />
                            <span>Porcentual</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-gold" />
                            <span>Monto Fijo</span>
                          </div>
                        )}
                      </td>

                      {/* Value */}
                      <td className="px-6 py-4.5 text-center font-bold text-white">
                        {c.type === 'percent' ? `${c.value}%` : `$${formatPrice(c.value)}`}
                      </td>

                      {/* Min Purchase */}
                      <td className="px-6 py-4.5 text-center font-semibold text-gray-400">
                        {c.minPurchase > 0 ? `$${formatPrice(c.minPurchase)}` : 'Sin mínimo'}
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4.5 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className={isExpired ? 'text-red-400 line-through' : ''}>
                            {new Date(c.expiryDate + 'T12:00:00').toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                              Expirado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <button
                          onClick={() => handleToggleStatus(c.code, c.status)}
                          className="focus:outline-none bg-transparent border-none cursor-pointer p-0"
                          title="Click para cambiar estado"
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
                        <button
                          onClick={() => handleDelete(c.code)}
                          className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer bg-transparent border-none"
                          title="Eliminar Cupón"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Drawer Lateral Derecho de Creación */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-charcoal-light border-l border-charcoal-border shadow-2xl z-[201] flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="h-20 flex justify-between items-center px-6 border-b border-charcoal-border bg-[#070707]">
              <div>
                <h3 className="font-serif text-lg text-white font-semibold">Nuevo Cupón de Descuento</h3>
                <p className="text-xs text-gray-500 mt-0.5">Crear un nuevo beneficio promocional.</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 hover:bg-white/5 rounded-full transition-colors cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Código del Cupón</label>
                <input 
                  type="text"
                  placeholder="Ej: MASAMADRE20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors font-mono uppercase"
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
                    className={`py-3 rounded border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    className={`py-3 rounded border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors pl-8"
                    required
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    {newType === 'percent' ? <Percent className="w-3.5 h-3.5" /> : <span className="text-xs">$</span>}
                  </div>
                </div>
              </div>

              {/* Minimum Purchase */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Compra Mínima Requerida ($)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    value={newMinPurchase}
                    onChange={(e) => setNewMinPurchase(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors pl-8"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <span className="text-xs">$</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 block">Ingrese 0 si no se requiere un monto mínimo de compra.</span>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Fecha de Expiración</label>
                <input 
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors font-sans"
                  required
                />
              </div>

              {/* Initial Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Estado Inicial</label>
                <div className="flex items-center justify-between bg-[#0d0d0d] p-3.5 rounded border border-charcoal-border/50">
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
              <div className="bg-[#121008]/40 border border-gold/15 p-4 rounded text-xs space-y-2 text-gray-400 shadow-inner">
                <div className="flex items-center gap-2 text-gold font-bold uppercase tracking-widest text-[9px] mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Resumen del Beneficio</span>
                </div>
                <p>
                  El código <span className="font-mono font-bold text-white">{newCode.trim().toUpperCase() || 'N/A'}</span> otorgará un descuento de <span className="font-bold text-white">{newType === 'percent' ? `${newValue}%` : `$${formatPrice(newValue)}`}</span>.
                </p>
                {newMinPurchase > 0 ? (
                  <p>Aplica para compras desde <span className="font-bold text-white">${formatPrice(newMinPurchase)}</span>.</p>
                ) : (
                  <p>No requiere monto mínimo de compra.</p>
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
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 border border-charcoal-border hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-colors cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg transition-colors cursor-pointer border-none outline-none font-sans"
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
