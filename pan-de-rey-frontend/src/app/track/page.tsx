'use client';

import { useState } from 'react';
import Navbar from "@/components/Navbar";
import { getApiUrl } from '@/utils/api';
import { Search, Loader2, Package, Calendar, Truck, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

type TrackingData = {
  orderNumber: string;
  status: string;
  deliveryStatus: string;
  shippingMethod: string;
  createdAt: string;
  totalAmount: number;
  customerName: string;
  driver: {
    name: string;
    phone: string;
    vehicle: string;
  } | null;
  items: {
    productName: string;
    variantName: string;
    quantity: number;
  }[];
};

export default function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackingData | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !email) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const url = new URL(getApiUrl('/api/orders/track'));
      url.searchParams.append('orderNumber', orderNumber.trim());
      url.searchParams.append('email', email.trim());

      const res = await fetch(url.toString());
      const data = await res.json();

      if (res.ok) {
        setOrder(data);
      } else {
        setError(data.error || 'No se encontró el pedido o el correo electrónico no coincide.');
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError('Ocurrió un error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getStepperIndex = (status: string, deliveryStatus: string) => {
    const s = status.toLowerCase();
    const ds = (deliveryStatus || '').toLowerCase();

    if (s === 'entregado' || ds === 'delivered') return 4;
    if (s === 'en camino' || ds === 'in_transit' || s === 'en ruta') return 3;
    if (s === 'listo' || s === 'listo para retiro' || s === 'listo para despacho') return 2;
    if (s === 'preparando' || s === 'en preparación' || s === 'incompleto') return 1;
    return 0;
  };

  const steps = [
    { title: 'Recibido', desc: 'Pedido ingresado' },
    { title: 'En Cocina', desc: 'Preparando tus panes' },
    { title: 'Listo', desc: 'Control de calidad listo' },
    { title: order?.shippingMethod === 'Delivery' ? 'En Camino' : 'Listo Retiro', desc: order?.shippingMethod === 'Delivery' ? 'En ruta de reparto' : 'Listo en mostrador' },
    { title: 'Entregado', desc: '¡Que lo disfrutes!' }
  ];

  const activeIndex = order ? getStepperIndex(order.status, order.deliveryStatus) : 0;

  return (
    <main className="min-h-screen bg-background text-white pb-16">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-wide">Seguimiento de Pedido</h1>
          <p className="text-gold font-sans text-xs uppercase tracking-widest mt-2">Consulte el estado de preparación y despacho de su compra en tiempo real</p>
        </div>

        <div className="bg-[#121212] border border-charcoal-border/70 rounded-xl p-6 md:p-8 shadow-2xl mb-8">
          <form onSubmit={handleTrack} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2 font-bold">Código de Pedido</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ej. PDR-1011"
                required
                className="w-full bg-[#1c1c1c] text-white text-xs border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-gold placeholder:text-gray-600"
              />
            </div>
            
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2 font-bold">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                required
                className="w-full bg-[#1c1c1c] text-white text-xs border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-gold placeholder:text-gray-600"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-black hover:bg-gold-hover transition-colors font-bold uppercase tracking-wider text-xs py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Consultar Estado
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-medium">
              ⚠️ {error}
            </div>
          )}
        </div>

        {order && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#121212] border border-charcoal-border/70 rounded-xl p-6 md:p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-charcoal-border/50 pb-4">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Estado Actual</p>
                  <h3 className="text-xl font-serif text-gold font-bold mt-1 uppercase tracking-wide">
                    {order.status === 'En Camino' ? '📦 En Camino' : order.status === 'Entregado' ? '✅ Entregado' : order.status}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Tipo de Entrega</p>
                  <p className="text-xs text-white mt-1 font-medium bg-gold/10 border border-gold/20 px-3 py-1 rounded">
                    {order.shippingMethod === 'Delivery' ? '🚗 Envío Domicilio' : '🛍️ Retiro en Local'}
                  </p>
                </div>
              </div>

              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-2 pt-4">
                <div className="absolute top-[28px] left-4 right-4 h-0.5 bg-white/5 z-0 hidden md:block" />
                <div 
                  className="absolute top-[28px] left-4 h-0.5 bg-gold transition-all duration-500 z-0 hidden md:block"
                  style={{ width: `${(activeIndex / 4) * 100}%` }}
                />

                {steps.map((step, idx) => {
                  const isCompleted = idx <= activeIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <div key={idx} className="flex md:flex-col items-center gap-4 md:gap-2 flex-1 z-10 w-full text-left md:text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 font-bold text-xs ${
                        isCompleted 
                          ? 'bg-gold text-black border-gold shadow-[0_0_12px_rgba(197,168,128,0.3)]' 
                          : 'bg-[#121212] text-gray-600 border-white/10'
                      } ${isActive ? 'scale-110 ring-2 ring-gold/20' : ''}`}>
                        {idx < activeIndex ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : idx + 1}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isCompleted ? 'text-white' : 'text-gray-500'}`}>{step.title}</p>
                        <p className="text-[10px] text-gray-500 font-light mt-0.5 hidden md:block">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#121212] border border-charcoal-border/70 rounded-xl p-6 shadow-2xl space-y-4">
                <h4 className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-2 border-b border-charcoal-border/50 pb-2">
                  <Package className="w-4 h-4" /> Detalle del Pedido
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Correlativo</span>
                    <span className="text-white font-mono font-bold tracking-widest text-sm">{order.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Fecha de Ingreso</span>
                    <span className="text-white font-medium">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold mb-2">Artículos del Pedido</span>
                  <div className="bg-black/25 rounded border border-white/5 p-3 space-y-2">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                        <span className="text-gray-300 font-medium">{it.productName} <span className="text-[10px] text-gray-500">({it.variantName})</span></span>
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-white font-bold">{it.quantity} un.</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-charcoal-border/50">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Monto Pagado</span>
                  <span className="text-lg text-gold font-serif font-bold">${order.totalAmount.toLocaleString('es-CL')}</span>
                </div>
              </div>

              <div className="bg-[#121212] border border-charcoal-border/70 rounded-xl p-6 shadow-2xl space-y-4">
                <h4 className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-2 border-b border-charcoal-border/50 pb-2">
                  <Truck className="w-4 h-4" /> Información de Despacho
                </h4>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Nombre del Cliente</span>
                    <span className="text-white font-medium text-sm flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-gold/60" /> {order.customerName}
                    </span>
                  </div>

                  {order.shippingMethod === 'Delivery' ? (
                    <>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Estado del Despacho</span>
                        <span className="inline-block bg-[#161616] text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1">
                          {order.deliveryStatus === 'unassigned' ? 'Sin repartidor asignado'
                           : order.deliveryStatus === 'assigned' ? 'Repartidor asignado'
                           : order.deliveryStatus === 'in_transit' ? 'En Ruta de Despacho'
                           : order.deliveryStatus === 'delivered' ? 'Entregado con Éxito'
                           : order.deliveryStatus === 'failed_attempt' ? 'Intento de Entrega Fallido'
                           : order.deliveryStatus === 'returned' ? 'Retornado a Local'
                           : order.deliveryStatus}
                        </span>
                      </div>

                      {order.driver ? (
                        <div className="bg-gold/5 border border-gold/15 p-3 rounded-lg space-y-2 mt-2">
                          <p className="text-[10px] text-gold uppercase tracking-wider font-bold">Repartidor Asignado</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Nombre</span>
                              <span className="text-white font-medium">{order.driver.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Vehículo</span>
                              <span className="text-white font-medium uppercase">{order.driver.vehicle}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/5 border border-white/15 rounded-lg text-gray-500 text-xs font-light">
                          Su pedido está siendo preparado y pronto se le asignará un repartidor oficial de Pan de Rey.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-[#161616]/80 border border-white/5 p-4 rounded-lg flex items-start gap-3 mt-2">
                      <ShieldCheck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gold font-bold text-xs uppercase tracking-wider">Retiro en Mostrador</p>
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                          Por favor acércate a nuestro local principal para retirar tu compra una vez que el estado del pedido cambie a <strong>Listo</strong>. Indica tu código correlativo al cajero.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
