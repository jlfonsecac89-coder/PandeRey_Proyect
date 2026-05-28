"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import { DollarSign, Package, ShoppingBag, AlertTriangle, AlertCircle, XCircle, Ban, Store, Truck } from 'lucide-react';

// Tipos
type TimeFilter = '1h' | '4h' | '1d' | '7d' | '15d' | '30d';
type Metric = 'ventas' | 'unidades';
type ViewType = 'productos' | 'categorias';

// Mock KPIs Fijos (Fallback)
const kpisFallback = {
  ventas: 1450000,
  unidades: 342,
  pedidos: 128,
  alerta: 5,   // 6 a 9 productos
  riesgo: 3,   // 4 a 5 productos
  critico: 2,  // 1 a 3 productos
  sinStock: 1, // 0 productos
  pendientesRetiro: 12,
  pendientesEnvio: 8,
};

// Generador de datos simulados según el filtro temporal para que la gráfica sea "interactiva"
const getMockMainData = (time: TimeFilter, view: ViewType) => {
  const multiplier = time === '1h' ? 0.05 : time === '4h' ? 0.15 : time === '1d' ? 0.4 : time === '7d' ? 1 : time === '15d' ? 2 : 4;
  
  if (view === 'productos') {
    return [
      { name: 'Pan de Masa Madre', ventas: Math.round(500000 * multiplier), unidades: Math.round(150 * multiplier) },
      { name: 'Baguette Tradicional', ventas: Math.round(300000 * multiplier), unidades: Math.round(200 * multiplier) },
      { name: 'Croissant Mantequilla', ventas: Math.round(450000 * multiplier), unidades: Math.round(300 * multiplier) },
      { name: 'Tarta de Limón', ventas: Math.round(200000 * multiplier), unidades: Math.round(40 * multiplier) },
      { name: 'Focaccia Romero', ventas: Math.round(150000 * multiplier), unidades: Math.round(80 * multiplier) },
    ];
  } else {
    return [
      { name: 'Panadería', ventas: Math.round(950000 * multiplier), unidades: Math.round(430 * multiplier) },
      { name: 'Pastelería', ventas: Math.round(650000 * multiplier), unidades: Math.round(340 * multiplier) },
      { name: 'Cafetería', ventas: Math.round(150000 * multiplier), unidades: Math.round(120 * multiplier) },
      { name: 'Sin Gluten', ventas: Math.round(100000 * multiplier), unidades: Math.round(40 * multiplier) },
    ];
  }
};

const getMockMaterialData = (time: TimeFilter) => {
  const multiplier = time === '1h' ? 0.05 : time === '4h' ? 0.15 : time === '1d' ? 0.4 : time === '7d' ? 1 : time === '15d' ? 2 : 4;
  return [
    { name: 'Harina de Trigo', ventas: Math.round(800000 * multiplier), unidades: Math.round(500 * multiplier) },
    { name: 'Mantequilla Premium', ventas: Math.round(600000 * multiplier), unidades: Math.round(200 * multiplier) },
    { name: 'Chocolate 70%', ventas: Math.round(400000 * multiplier), unidades: Math.round(100 * multiplier) },
    { name: 'Harina Centeno', ventas: Math.round(200000 * multiplier), unidades: Math.round(80 * multiplier) },
    { name: 'Azúcar Rubia', ventas: Math.round(150000 * multiplier), unidades: Math.round(150 * multiplier) },
  ];
};

const recentOrdersFallback = [
  { id: 'ORD-001', monto: 25500, tipo: 'Retiro en Tienda', estado: 'Pendiente' },
  { id: 'ORD-002', monto: 18900, tipo: 'Envío Propio', estado: 'Preparación' },
  { id: 'ORD-003', monto: 45000, tipo: 'Retiro en Tienda', estado: 'Listo' },
  { id: 'ORD-004', monto: 12500, tipo: 'Envío Propio', estado: 'En Ruta' },
  { id: 'ORD-005', monto: 32000, tipo: 'Retiro en Tienda', estado: 'Entregado' },
];

export default function AdminDashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [mainMetric, setMainMetric] = useState<Metric>('ventas');
  const [mainView, setMainView] = useState<ViewType>('productos');
  const [materialMetric, setMaterialMetric] = useState<Metric>('unidades');

  // API Integration states
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [kpiData, setKpiData] = useState<any>(kpisFallback);
  const [mainData, setMainData] = useState<any[]>([]);
  const [recentOrdersList, setRecentOrdersList] = useState<any[]>(recentOrdersFallback);
  const [rawAnalytics, setRawAnalytics] = useState<any>(null);

  const materialData = getMockMaterialData(timeFilter);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/orders/analytics');
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      
      setRawAnalytics(data);
      setKpiData(data.kpis);
      setIsLive(true);
      
      // Fetch recent orders
      try {
        const ordRes = await fetch('http://localhost:3001/api/orders');
        if (ordRes.ok) {
          const ordData = await ordRes.json();
          const formatted = ordData.slice(0, 5).map((o: any) => ({
            id: o.id.substring(0, 8).toUpperCase(),
            monto: o.total,
            tipo: o.shippingMethod === 'Delivery' ? 'Envío Propio' : 'Retiro en Tienda',
            estado: o.status === 'Preparando' ? 'Preparación' : o.status === 'Listo' ? 'Listo' : o.status === 'En Ruta' ? 'En Ruta' : o.status === 'Entregado' ? 'Entregado' : o.status
          }));
          setRecentOrdersList(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch recent orders list:', err);
      }
      
    } catch (err) {
      console.warn('Dashboard API not available, falling back to mock data:', err);
      setIsLive(false);
      setKpiData(kpisFallback);
      setRecentOrdersList(recentOrdersFallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const res = await fetch('http://localhost:3001/api/orders/seed');
      if (!res.ok) throw new Error('Seed failed');
      const data = await res.json();
      alert(`Éxito: ${data.message}`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error: No se pudo poblar la base de datos. Asegúrate de que el backend esté corriendo en http://localhost:3001');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (isLive && rawAnalytics) {
      // Filter/scale by timeFilter if desired, otherwise display raw values
      // Note: timeFilter multiplier is simulated for mock charts, for live database we show raw aggregated totals
      if (mainView === 'productos') {
        const mapped = (rawAnalytics.productSales || []).map((p: any) => ({
          name: p.name,
          ventas: parseFloat(p.totalAmount || 0),
          unidades: parseInt(p.totalUnits || 0)
        }));
        setMainData(mapped);
      } else {
        const mapped = (rawAnalytics.categoryDistribution || []).map((c: any) => ({
          name: c.name,
          ventas: parseFloat(c.value || 0),
          unidades: parseInt(c.units || (c.value / 3000))
        }));
        setMainData(mapped);
      }
    } else {
      setMainData(getMockMainData(timeFilter, mainView));
    }
  }, [mainView, timeFilter, isLive, rawAnalytics]);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-charcoal-light p-4 rounded-xl border border-charcoal-border sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center w-full lg:w-auto gap-4">
          <div>
            <h1 className="text-xl font-serif text-white tracking-wide flex items-center gap-2">
              Panel de Control
              {isLive && (
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse" title="Conexión en vivo con base de datos" />
              )}
            </h1>
            <p className="text-sm text-gray-400">Resumen operativo y comercial</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className={`px-4 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] border border-gold/30 text-gold bg-gold/5 hover:bg-gold hover:text-black transition-all active:scale-95 shadow-md ${
              seeding ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {seeding ? 'Poblando...' : 'Poblar Base de Datos (Seed)'}
          </button>
          
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: '1h', label: '1 Hora' }, { id: '4h', label: '4 Horas' }, { id: '1d', label: '1 Día' },
              { id: '7d', label: '7 Días' }, { id: '15d', label: '15 Días' }, { id: '30d', label: '1 Mes' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id as TimeFilter)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  timeFilter === t.id ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'bg-[#161616] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards (9) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Generales */}
        <div className="bg-[#161616] border border-white/5 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ventas</p>
          </div>
          <p className="text-3xl font-serif text-white font-bold">${kpiData.ventas.toLocaleString()}</p>
        </div>
        <div className="bg-[#161616] border border-white/5 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Package className="w-5 h-5" /></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Unidades</p>
          </div>
          <p className="text-3xl font-serif text-white font-bold">{kpiData.unidades}</p>
        </div>
        <div className="bg-[#161616] border border-white/5 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><ShoppingBag className="w-5 h-5" /></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pedidos</p>
          </div>
          <p className="text-3xl font-serif text-white font-bold">{kpiData.pedidos}</p>
        </div>
        <div className="bg-[#161616] border border-white/5 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold/10 text-gold rounded-lg"><Store className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Pendiente Retiro</p>
          </div>
          <p className="text-3xl font-serif text-white font-bold">{kpiData.pendientesRetiro}</p>
        </div>
        <div className="bg-[#161616] border border-white/5 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold/10 text-gold rounded-lg"><Truck className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Pendiente Envío</p>
          </div>
          <p className="text-3xl font-serif text-white font-bold">{kpiData.pendientesEnvio}</p>
        </div>

        {/* Stock Alerts */}
        <div className="bg-[#161616] border border-blue-500/20 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Alerta (6-9)</p>
          </div>
          <p className="text-3xl font-serif text-blue-500 font-bold">{kpiData.alerta}</p>
        </div>
        <div className="bg-[#161616] border border-yellow-500/20 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Riesgo (4-5)</p>
          </div>
          <p className="text-3xl font-serif text-yellow-500 font-bold">{kpiData.riesgo}</p>
        </div>
        <div className="bg-[#161616] border border-orange-500/20 p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><XCircle className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Crítico (1-3)</p>
          </div>
          <p className="text-3xl font-serif text-orange-500 font-bold">{kpiData.critico}</p>
        </div>
        <div className="bg-[#161616] border border-red-500/20 p-5 rounded-xl shadow-md xl:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><Ban className="w-5 h-5" /></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Sin Stock (0)</p>
          </div>
          <p className="text-3xl font-serif text-red-500 font-bold">{kpiData.sinStock}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-xl p-6 shadow-md flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-lg font-serif text-white tracking-wide">Rendimiento de Ventas</h2>
            <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded-lg border border-white/5">
              <button onClick={() => setMainMetric('ventas')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${mainMetric === 'ventas' ? 'bg-gold text-black' : 'text-gray-400 hover:text-white'}`}>Pesos ($)</button>
              <button onClick={() => setMainMetric('unidades')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${mainMetric === 'unidades' ? 'bg-gold text-black' : 'text-gray-400 hover:text-white'}`}>Unidades</button>
            </div>
            <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded-lg border border-white/5">
              <button onClick={() => setMainView('productos')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${mainView === 'productos' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'}`}>Productos</button>
              <button onClick={() => setMainView('categorias')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${mainView === 'categorias' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'}`}>Categorías</button>
            </div>
          </div>
          <div className="flex-1 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(val) => mainMetric === 'ventas' ? `$${val.toLocaleString()}` : val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }}
                  formatter={(value: any) => [mainMetric === 'ventas' && typeof value === 'number' ? `$${value.toLocaleString()}` : value, mainMetric === 'ventas' ? 'Monto' : 'Cantidad']}
                />
                <Bar dataKey={mainMetric} fill="#D4AF37" radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey={mainMetric} 
                    position="top" 
                    fill="#fff" 
                    fontSize={12} 
                    formatter={(val: any) => mainMetric === 'ventas' && typeof val === 'number' ? `$${(val/1000).toFixed(0)}k` : val} 
                  />
                  {mainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#D4AF37' : '#e6ca6e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="bg-[#161616] border border-white/5 rounded-xl p-6 shadow-md flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-serif text-white tracking-wide">Análisis Material (Top 5)</h2>
            <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded-lg border border-white/5">
              <button onClick={() => setMaterialMetric('ventas')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${materialMetric === 'ventas' ? 'bg-gold text-black' : 'text-gray-400'}`}>$</button>
              <button onClick={() => setMaterialMetric('unidades')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${materialMetric === 'unidades' ? 'bg-gold text-black' : 'text-gray-400'}`}>Q</button>
            </div>
          </div>
          <div className="flex-1 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={materialData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(val) => materialMetric === 'ventas' ? `$${(val/1000).toFixed(0)}k` : val} />
                <YAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }}
                  formatter={(value: any) => [materialMetric === 'ventas' && typeof value === 'number' ? `$${value.toLocaleString()}` : value, materialMetric === 'ventas' ? 'Monto' : 'Unidades']}
                />
                <Bar dataKey={materialMetric} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  <LabelList 
                    dataKey={materialMetric} 
                    position="right" 
                    fill="#fff" 
                    fontSize={10} 
                    formatter={(val: any) => materialMetric === 'ventas' && typeof val === 'number' ? `$${(val/1000).toFixed(0)}k` : val} 
                  />
                  {materialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-[#161616] border border-white/5 rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-serif text-white tracking-wide mb-6">Pedidos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] uppercase tracking-widest text-gray-500 bg-[#0a0a0a] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">ID Pedido</th>
                <th className="px-6 py-4 font-bold">Monto</th>
                <th className="px-6 py-4 font-bold">Tipo de Envío</th>
                <th className="px-6 py-4 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentOrdersList.map((order, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{order.id}</td>
                  <td className="px-6 py-4 text-gold font-bold">${order.monto.toLocaleString()}</td>
                  <td className="px-6 py-4">{order.tipo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.estado === 'Pendiente' || order.estado === 'Nuevo' ? 'bg-yellow-500/10 text-yellow-500' :
                      order.estado === 'Preparación' || order.estado === 'Preparando' ? 'bg-blue-500/10 text-blue-500' :
                      order.estado === 'En Ruta' ? 'bg-purple-500/10 text-purple-500' :
                      order.estado === 'Listo' ? 'bg-indigo-500/10 text-indigo-400' :
                      order.estado === 'Cancelado' ? 'bg-red-500/10 text-red-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {order.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
