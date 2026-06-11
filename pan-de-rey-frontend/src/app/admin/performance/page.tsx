"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Ticket, 
  Percent, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  Calendar, 
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
  BarChart2,
  Award
} from 'lucide-react';
import { 
  getLocalCoupons, 
  getLocalOrders, 
  getLocalProducts, 
  SimCoupon, 
  SimOrder,
  SimProduct
} from '@/utils/dbSim';
import { formatPrice } from '@/utils/format';

export default function PerformancePromos() {
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<SimCoupon[]>([]);
  const [orders, setOrders] = useState<SimOrder[]>([]);
  const [allProducts, setAllProducts] = useState<SimProduct[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setCoupons(getLocalCoupons());
    setOrders(getLocalOrders());
    setAllProducts(getLocalProducts());
  };

  if (!mounted) return null;

  // Filter coupons based on active/inactive status toggle
  const visibleCoupons = coupons.filter(c => {
    if (statusFilter === 'all') return true;
    const isExpired = new Date(c.expiryDate + 'T23:59:59') < new Date();
    const isActive = c.status === 'active' && !isExpired;
    return statusFilter === 'active' ? isActive : !isActive;
  });

  // Calculate statistics for each coupon
  const couponStats = coupons.map(coupon => {
    const couponOrders = orders.filter(o => o.couponCode === coupon.code && o.status !== 'Cancelado');
    const totalSalesWithCoupon = couponOrders.reduce((sum, o) => sum + o.total, 0);
    const totalDiscounts = couponOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const uses = couponOrders.length;
    
    // ROI Formula: ((Ventas con cupón - Descuento otorgado) / Descuento otorgado) * 100
    const roi = totalDiscounts > 0 
      ? Math.round(((totalSalesWithCoupon - totalDiscounts) / totalDiscounts) * 100) 
      : 0;

    let units = 0;
    couponOrders.forEach(o => {
      o.itemsRaw?.forEach(it => {
        // Check catalog restrictions
        let isAllowed = true;
        const prodId = Number(it.variantId.replace('var-prod-', ''));
        const prod = allProducts.find(p => p.id === prodId);
        
        if (coupon.limitProductIds?.length) {
          isAllowed = coupon.limitProductIds.includes(prodId);
        }
        if (isAllowed && coupon.limitCategories?.length && prod) {
          isAllowed = coupon.limitCategories.includes(prod.category);
        }
        if (isAllowed && coupon.limitSubCategories?.length && prod && prod.subCategory) {
          isAllowed = coupon.limitSubCategories.includes(prod.subCategory);
        }
        
        if (isAllowed) {
          units += it.quantity;
        }
      });
    });

    return {
      coupon,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      status: coupon.status,
      expiryDate: coupon.expiryDate,
      createdAt: coupon.createdAt,
      uses,
      totalSalesWithCoupon,
      totalDiscounts,
      units,
      roi
    };
  });

  // Filter the stats list based on active/inactive toggle
  const filteredCouponStats = couponStats.filter(stat => {
    if (statusFilter === 'all') return true;
    const isExpired = new Date(stat.expiryDate + 'T23:59:59') < new Date();
    const isActive = stat.status === 'active' && !isExpired;
    return statusFilter === 'active' ? isActive : !isActive;
  });

  // Rank coupons by totalSalesWithCoupon descending
  const rankedStats = [...filteredCouponStats].sort((a, b) => b.totalSalesWithCoupon - a.totalSalesWithCoupon);
  const bestCoupon = rankedStats[0]?.totalSalesWithCoupon > 0 ? rankedStats[0] : null;

  // Selected coupon detailed metrics (or all combined if 'all')
  const isAllSelected = selectedCouponCode === 'all';
  const selectedCoupon = coupons.find(c => c.code === selectedCouponCode);
  
  const activeStatsList = isAllSelected 
    ? filteredCouponStats 
    : couponStats.filter(s => s.code === selectedCouponCode);

  const totalSalesWithDiscount = activeStatsList.reduce((sum, s) => sum + s.totalSalesWithCoupon, 0);
  const totalDiscountsApplied = activeStatsList.reduce((sum, s) => sum + s.totalDiscounts, 0);
  const totalUses = activeStatsList.reduce((sum, s) => sum + s.uses, 0);
  const totalUnitsWithDiscount = activeStatsList.reduce((sum, s) => sum + s.units, 0);

  // Total store sales (excluding Cancelled)
  const activeStoreOrders = orders.filter(o => o.status !== 'Cancelado');
  const totalStoreSales = activeStoreOrders.reduce((sum, o) => sum + o.total, 0);
  
  let totalStoreUnits = 0;
  activeStoreOrders.forEach(o => {
    o.itemsRaw?.forEach(it => {
      totalStoreUnits += it.quantity;
    });
  });

  // ROI overall
  const overallRoi = totalDiscountsApplied > 0 
    ? Math.round(((totalSalesWithDiscount - totalDiscountsApplied) / totalDiscountsApplied) * 100)
    : 0;

  // % Sales & Units with Discount
  const percentSalesWithDiscount = totalStoreSales > 0 
    ? Math.round((totalSalesWithDiscount / totalStoreSales) * 100) 
    : 0;

  const percentUnitsWithDiscount = totalStoreUnits > 0 
    ? Math.round((totalUnitsWithDiscount / totalStoreUnits) * 100) 
    : 0;

  // Temporal analysis calculations: 15-day period comparison (Vigencia vs. Anterior vs. Posterior)
  const N = (() => {
    if (isAllSelected || !selectedCoupon) return 15;
    const start = new Date(selectedCoupon.createdAt).getTime();
    const end = new Date(selectedCoupon.expiryDate).getTime();
    const diffDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    return Math.max(1, diffDays);
  })();

  const campaignStart = (selectedCoupon && selectedCoupon.createdAt) 
    ? new Date(selectedCoupon.createdAt) 
    : new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const campaignEnd = (selectedCoupon && selectedCoupon.expiryDate) 
    ? new Date(selectedCoupon.expiryDate + 'T23:59:59') 
    : new Date();

  // Period ranges
  const beforeStart = new Date(campaignStart.getTime() - N * 24 * 60 * 60 * 1000);
  const beforeEnd = new Date(campaignStart.getTime() - 1000);

  const afterStart = new Date(campaignEnd.getTime() + 1000);
  const afterEnd = new Date(campaignEnd.getTime() + N * 24 * 60 * 60 * 1000);

  const getPeriodMetrics = (startDate: Date, endDate: Date) => {
    const periodOrders = orders.filter(o => {
      const date = new Date(o.createdAt);
      return date >= startDate && date <= endDate && o.status !== 'Cancelado';
    });

    const totalSales = periodOrders.reduce((sum, o) => sum + o.total, 0);
    
    let restrictedSales = 0;
    let totalUnits = 0;
    let restrictedUnits = 0;

    periodOrders.forEach(o => {
      o.itemsRaw?.forEach(it => {
        totalUnits += it.quantity;
        
        let isAllowed = true;
        if (selectedCoupon) {
          const prodId = Number(it.variantId.replace('var-prod-', ''));
          const prod = allProducts.find(p => p.id === prodId);
          
          if (selectedCoupon.limitProductIds?.length) {
            isAllowed = selectedCoupon.limitProductIds.includes(prodId);
          }
          if (isAllowed && selectedCoupon.limitCategories?.length && prod) {
            isAllowed = selectedCoupon.limitCategories.includes(prod.category);
          }
          if (isAllowed && selectedCoupon.limitSubCategories?.length && prod && prod.subCategory) {
            isAllowed = selectedCoupon.limitSubCategories.includes(prod.subCategory);
          }
        }
        
        if (isAllowed) {
          restrictedSales += it.subtotal;
          restrictedUnits += it.quantity;
        }
      });
    });

    return {
      totalSales,
      restrictedSales: selectedCoupon ? restrictedSales : totalSales,
      totalUnits,
      restrictedUnits: selectedCoupon ? restrictedUnits : totalUnits
    };
  };

  const beforePeriodStats = getPeriodMetrics(beforeStart, beforeEnd);
  const duringPeriodStats = getPeriodMetrics(campaignStart, campaignEnd);
  const afterPeriodStats = getPeriodMetrics(afterStart, afterEnd);

  // Percent changes for validity comparison
  const calcPercentChange = (current: number, base: number) => {
    if (base === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - base) / base) * 100);
  };

  const salesChangeBefore = calcPercentChange(duringPeriodStats.restrictedSales, beforePeriodStats.restrictedSales);
  const salesChangeAfter = calcPercentChange(duringPeriodStats.restrictedSales, afterPeriodStats.restrictedSales);
  const unitsChangeBefore = calcPercentChange(duringPeriodStats.restrictedUnits, beforePeriodStats.restrictedUnits);
  const unitsChangeAfter = calcPercentChange(duringPeriodStats.restrictedUnits, afterPeriodStats.restrictedUnits);

  // Generate automated AI diagnostic text
  const generateDiagnostic = () => {
    if (!bestCoupon) {
      return 'No hay suficientes datos de cupones para generar un diagnóstico. Los cupones deben aplicarse en pedidos no cancelados para calcular rendimiento.';
    }

    const name = bestCoupon.code;
    const roiVal = bestCoupon.roi;
    const salesVal = bestCoupon.totalSalesWithCoupon;
    const usesVal = bestCoupon.uses;
    const discVal = bestCoupon.totalDiscounts;

    return `El cupón **${name}** se posiciona como el líder indiscutido del ranking de rendimiento. Ha generado ventas totales por **$${formatPrice(salesVal)} CLP** distribuidas en **${usesVal} transacciones**, otorgando un total de **$${formatPrice(discVal)} CLP** en descuentos directos. Esto representa un **ROI del ${roiVal}%**, demostrando una eficiencia financiera excepcional para atraer compras de alto ticket. Los indicadores evaluados para este diagnóstico incluyen: volumen total de venta atribuido, costo financiero de la promoción (descuento absorbido), ROI porcentual y tasa de redención (frecuencia de uso).`;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-charcoal-light/35 p-4 rounded-xl border border-charcoal-border shadow-lg">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-wide font-semibold flex items-center gap-2">
            Performance Promos
            <TrendingUp className="w-5 h-5 text-gold" />
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Análisis financiero y retorno de inversión de campañas promocionales y códigos de descuento.
          </p>
        </div>
        
        {/* State Filter Toggle */}
        <div className="flex items-center gap-3 bg-[#0d0d0d] border border-charcoal-border p-1.5 rounded-lg">
          <button 
            onClick={() => { setStatusFilter('all'); setSelectedCouponCode('all'); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
              statusFilter === 'all' 
                ? 'bg-gold text-black' 
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            Todos
          </button>
          <button 
            onClick={() => { setStatusFilter('active'); setSelectedCouponCode('all'); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
              statusFilter === 'active' 
                ? 'bg-gold text-black' 
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            Activos
          </button>
          <button 
            onClick={() => { setStatusFilter('inactive'); setSelectedCouponCode('all'); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
              statusFilter === 'inactive' 
                ? 'bg-gold text-black' 
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Global Page Filters - Select Coupon */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-gold" />
          <span className="text-xs text-gray-300 font-bold">Filtrar hoja por cupón específico:</span>
        </div>
        
        <select
          value={selectedCouponCode}
          onChange={(e) => setSelectedCouponCode(e.target.value)}
          className="w-full sm:w-72 bg-[#0d0d0d] border border-charcoal-border text-white text-xs px-3 py-2.5 rounded-lg outline-none focus:border-gold/40 transition-colors font-mono font-bold cursor-pointer"
        >
          <option value="all" className="font-sans font-bold">VER RESUMEN GLOBAL (Todos los cupones)</option>
          {visibleCoupons.map(c => (
            <option key={c.code} value={c.code}>
              {c.code} ({c.type === 'percent' ? `${c.value}%` : `$${c.value}`})
            </option>
          ))}
        </select>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Ventas con Cupón */}
        <div className="bg-[#111] border border-charcoal-border p-5 rounded-xl shadow-lg relative overflow-hidden group">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Ventas con Descuento</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-serif font-bold text-white">${formatPrice(totalSalesWithDiscount)} CLP</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">({percentSalesWithDiscount}% del total)</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-2 font-mono">Facturación total de la tienda: ${formatPrice(totalStoreSales)}</span>
        </div>

        {/* KPI 2: Costo Descuentos */}
        <div className="bg-[#111] border border-charcoal-border p-5 rounded-xl shadow-lg relative overflow-hidden group">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Descuentos Otorgados</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-serif font-bold text-gold-hover">${formatPrice(totalDiscountsApplied)} CLP</span>
            <span className="text-[10px] text-gray-500 font-mono">({totalUses} canjes)</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-2">Costo absorbido directo de la promoción</span>
        </div>

        {/* KPI 3: ROI */}
        <div className="bg-[#111] border border-charcoal-border p-5 rounded-xl shadow-lg relative overflow-hidden group">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Retorno de Inversión (ROI)</span>
          <div className="flex justify-between items-baseline">
            <span className={`text-2xl font-serif font-bold ${overallRoi >= 100 ? 'text-emerald-400' : 'text-gold-hover'}`}>
              {overallRoi}%
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Multiplicador: {totalDiscountsApplied > 0 ? (totalSalesWithDiscount / totalDiscountsApplied).toFixed(1) : 0}x</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-2">Retorno neto por cada peso chilenos descontado</span>
        </div>

        {/* KPI 4: Unidades */}
        <div className="bg-[#111] border border-charcoal-border p-5 rounded-xl shadow-lg relative overflow-hidden group">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Unidades Promocionadas</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-serif font-bold text-white">{totalUnitsWithDiscount} un.</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">({percentUnitsWithDiscount}% del total)</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-2 font-mono">Total unidades vendidas: {totalStoreUnits}</span>
        </div>

      </div>

      {/* Main Section: Validity Comparison & Graphical Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Validity Comparison Card */}
        <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-charcoal-border/50 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold" />
                Comparativa de Periodo de Vigencia ({N} Días)
              </h3>
              {!isAllSelected && selectedCoupon && (
                <span className="text-[9px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono">
                  {selectedCoupon.createdAt} al {selectedCoupon.expiryDate}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Mide el comportamiento de compra del catálogo limitado {selectedCoupon ? `(${selectedCoupon.code})` : ''} durante la campaña frente al mismo lapso previo y posterior.
            </p>

            {/* Comparison Grid */}
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              
              {/* Before */}
              <div className="bg-[#0c0c0c] border border-charcoal-border/50 p-4 rounded-xl">
                <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                  1. Antes ({N} días)
                </span>
                <span className="text-base font-serif font-bold text-gray-400 block font-mono">
                  ${formatPrice(beforePeriodStats.restrictedSales)}
                </span>
                <span className="text-[9px] text-gray-600 block font-mono mt-1">
                  {beforePeriodStats.restrictedUnits} un. vendidas
                </span>
              </div>

              {/* During */}
              <div className="bg-[#121008] border border-gold/30 p-4 rounded-xl ring-1 ring-gold/10">
                <span className="text-[8px] font-bold uppercase tracking-widest text-gold block mb-1">
                  2. Durante ({N} días)
                </span>
                <span className="text-lg font-serif font-bold text-gold-hover block font-mono">
                  ${formatPrice(duringPeriodStats.restrictedSales)}
                </span>
                <span className="text-[9px] text-gray-400 block font-mono mt-1">
                  {duringPeriodStats.restrictedUnits} un. vendidas
                </span>
              </div>

              {/* After */}
              <div className="bg-[#0c0c0c] border border-charcoal-border/50 p-4 rounded-xl">
                <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                  3. Después ({N} días)
                </span>
                <span className="text-base font-serif font-bold text-gray-400 block font-mono">
                  ${formatPrice(afterPeriodStats.restrictedSales)}
                </span>
                <span className="text-[9px] text-gray-600 block font-mono mt-1">
                  {afterPeriodStats.restrictedUnits} un. vendidas
                </span>
              </div>

            </div>
          </div>

          {/* Analysis Metrics Progress Bars */}
          <div className="space-y-4 pt-4 border-t border-charcoal-border/30">
            
            {/* Sales Growth Before */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">Crecimiento Ventas vs. Periodo Anterior</span>
                <span className={salesChangeBefore >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {salesChangeBefore >= 0 ? '+' : ''}{salesChangeBefore}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${salesChangeBefore >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(10, Math.abs(salesChangeBefore)))}%` }}
                />
              </div>
            </div>

            {/* Sales Growth After */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">Retención Ventas vs. Periodo Posterior</span>
                <span className={salesChangeAfter >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {salesChangeAfter >= 0 ? '+' : ''}{salesChangeAfter}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${salesChangeAfter >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(10, Math.abs(salesChangeAfter)))}%` }}
                />
              </div>
            </div>

            {/* General Info Alert */}
            <div className="bg-[#161616]/40 border border-white/5 p-3 rounded-lg flex gap-2.5 items-start mt-2">
              <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 leading-relaxed">
                <strong className="text-gray-400">Restricciones aplicadas:</strong> El análisis comparativo de vigencia del cupón filtra los subtotales de las compras del catálogo limitado configurado (excluyendo envío) para garantizar que los aumentos de volumen sean atribuibles a la promoción.
              </p>
            </div>

          </div>
        </div>

        {/* Diagnostic Insight Card */}
        <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-charcoal-border/50 pb-3">
              <Award className="w-4.5 h-4.5 text-gold" />
              Diagnóstico de Campaña
            </h3>

            <div className="bg-[#18150c] border border-gold/15 p-4 rounded-xl text-xs space-y-4">
              <div className="flex items-center gap-2 text-gold font-bold uppercase tracking-widest text-[9px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cupón de Mayor Rendimiento</span>
              </div>
              <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: generateDiagnostic() }} />
            </div>
          </div>

          <div className="pt-6 border-t border-charcoal-border/50 text-[10px] text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-400 block mb-1">Criterios de Ranking:</span>
            El rendimiento absoluto se pondera según la facturación total generada con cupón y su rentabilidad relativa (ROI %).
          </div>
        </div>

      </div>

      {/* Coupon Ranking Section */}
      <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-charcoal-border/50 pb-3 mb-4">
          <BarChart2 className="w-4.5 h-4.5 text-gold" />
          Ranking de Cupones por Volumen Generado
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 border-collapse">
            <thead className="text-[9px] text-gray-500 uppercase font-bold tracking-widest border-b border-charcoal-border/50">
              <tr>
                <th className="py-3.5 text-center w-12">Puesto</th>
                <th className="py-3.5">Cupón</th>
                <th className="py-3.5 text-center">Usos</th>
                <th className="py-3.5 text-right">Monto Descuentos</th>
                <th className="py-3.5 text-right">Venta Generada</th>
                <th className="py-3.5 text-center">ROI</th>
                <th className="py-3.5">Eficiencia Relativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-border/20">
              {rankedStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500 italic">
                    No se registran usos para cupones en este estado.
                  </td>
                </tr>
              ) : (
                rankedStats.map((stat, idx) => {
                  const placeColors = [
                    'bg-gold text-black font-black',
                    'bg-gray-300 text-black font-bold',
                    'bg-amber-700 text-white font-bold',
                  ];
                  const placeClass = placeColors[idx] || 'bg-charcoal-border text-gray-400';
                  
                  // Progress bar for share of sales
                  const maxSales = Math.max(...rankedStats.map(s => s.totalSalesWithCoupon));
                  const percentOfMax = maxSales > 0 ? (stat.totalSalesWithCoupon / maxSales) * 100 : 0;

                  return (
                    <tr key={stat.code} className="hover:bg-white/[0.01] transition-colors">
                      {/* Puesto */}
                      <td className="py-4 text-center">
                        <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] leading-none ${placeClass}`}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Cupón */}
                      <td className="py-4 font-mono font-bold text-white text-xs">
                        <span className="bg-[#0c0c0c] px-2 py-0.5 rounded border border-charcoal-border text-gold-hover">
                          {stat.code}
                        </span>
                      </td>

                      {/* Usos */}
                      <td className="py-4 text-center font-mono">
                        {stat.uses}
                      </td>

                      {/* Monto Descuentos */}
                      <td className="py-4 text-right font-mono text-gray-400">
                        ${formatPrice(stat.totalDiscounts)}
                      </td>

                      {/* Venta Generada */}
                      <td className="py-4 text-right font-mono font-bold text-white">
                        ${formatPrice(stat.totalSalesWithCoupon)}
                      </td>

                      {/* ROI */}
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          stat.roi >= 150 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gold/10 text-gold border border-gold/20'
                        }`}>
                          {stat.roi}%
                        </span>
                      </td>

                      {/* Eficiencia Relativa */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                            <div 
                              className="h-full rounded-full bg-gold"
                              style={{ width: `${percentOfMax}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono font-bold">
                            {Math.round(percentOfMax)}%
                          </span>
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

    </div>
  );
}
