"use client";

import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, AlertTriangle, AlertCircle, RefreshCw, MessageSquare, ShieldCheck, Check, Search } from 'lucide-react';

// Tipos
type OrderStatus = 'Nuevo' | 'Preparación' | 'Listo' | 'Enviado';

type OrderItemRaw = {
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Order = {
  id: string;
  realId?: string;
  customerName: string;
  email: string;
  phone: string;
  items: string[];
  itemsRaw?: OrderItemRaw[];
  total: number;
  status: string; // Estado real de base de datos
  time: string;
  createdAt: string;
  shippingMethod: string;
  slaStartedAt: string | null;
  slaPausedAt: string | null;
  slaPausedTime: number;
  deliveryPin: string | null;
};

// Catálogo de variantes fijas de la panadería para la sustitución de stock
const productVariantsCatalog = [
  { id: 'var-prod-1', name: 'Pan de Masa Madre Clásico (Clásico)', price: 4500 },
  { id: 'var-prod-2', name: 'Focaccia al Romero (Clásico)', price: 3800 },
  { id: 'var-prod-3', name: 'Baguette Tradicional (Clásico)', price: 1800 },
  { id: 'var-prod-6', name: 'Croissant de Mantequilla (Clásico)', price: 2200 },
  { id: 'var-prod-7', name: 'Pain au Chocolat (Clásico)', price: 2500 },
  { id: 'var-prod-10', name: 'Brownie Sin Gluten (Clásico)', price: 2500 },
  { id: 'var-prod-13', name: 'Café Latte XL (Clásico)', price: 3500 },
  { id: 'var-prod-1-semillas', name: 'Pan de Masa Madre Clásico (Con Semillas)', price: 6500 }
];

const getApiUrl = (path: string) => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3001${path}`;
    }
  }
  return path;
};

// Componente del Cronómetro del SLA
function SlaTimer({ startedAt, pausedAt, pausedTime, status }: { startedAt: string | null, pausedAt: string | null, pausedTime: number, status: string }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;

    const calculateTime = () => {
      const startTime = new Date(startedAt).getTime();
      // Si está pausado (ej: Incompleto), congelar el tiempo actual en la fecha de pausa
      const now = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000) - pausedTime;
      const totalSla = 40 * 60; // 40 minutos de SLA
      setTimeLeft(totalSla - elapsedSeconds);
    };

    calculateTime();
    if (pausedAt || status === 'Entregado' || status === 'Cancelado') {
      return; // No refrescar si está pausado o ya finalizó
    }

    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startedAt, pausedAt, pausedTime, status]);

  if (timeLeft === null) return null;

  const isExceeded = timeLeft < 0;
  const absSeconds = Math.abs(timeLeft);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  const timeString = `${isExceeded ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
      isExceeded 
        ? 'bg-red-500/10 text-red-500 border border-red-500/30' 
        : pausedAt 
          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 animate-pulse'
          : 'bg-gold/10 text-gold border border-gold/30'
    }`}>
      <Clock className="w-3 h-3" />
      {pausedAt ? `Pausado: ${timeString}` : timeString}
    </div>
  );
}

export default function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'kanban' | 'exceptions'>('kanban');

  // Estados de Modales y Formularios
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinOrderId, setPinOrderId] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subOrder, setSubOrder] = useState<Order | null>(null);
  const [variantToRemove, setVariantToRemove] = useState<string>('');
  const [variantToAdd, setVariantToAdd] = useState<string>('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/orders'));
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      
      setOrders(data);
      setIsLive(true);
    } catch (err) {
      console.warn('Orders API not available in local mode, simulating offline database.');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Mover pedido de estado (Kanban)
  const moveOrder = async (id: string, newDbStatus: string, pinCode?: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (isLive) {
      try {
        const payload: any = {
          orderId: order.realId || order.id,
          newStatus: newDbStatus
        };
        if (pinCode) {
          payload.pin = pinCode;
        }

        const res = await fetch(getApiUrl('/api/orders/update-status'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok) {
          setIsPinModalOpen(false);
          setEnteredPin('');
          setPinError('');
          fetchOrders();
        } else {
          if (newDbStatus === 'Entregado' && order.shippingMethod === 'Delivery') {
            setPinError(data.error || 'Código PIN incorrecto');
          } else {
            alert(data.error || 'Error al actualizar el estado en el servidor');
          }
        }
      } catch (err) {
        console.error('Failed to update status:', err);
        alert('Error de conexión al actualizar estado');
      }
    } else {
      alert('Funcionalidad en vivo deshabilitada. Conecta la base de datos MySQL.');
    }
  };

  // Procesar Sustitución de Producto Faltante
  const handleSubstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subOrder || !variantToRemove || !variantToAdd) {
      alert('Por favor selecciona los productos a remover y añadir.');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/orders/substitute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: subOrder.realId || subOrder.id,
          variantIdToRemove: variantToRemove,
          variantIdToAdd: variantToAdd
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setIsSubModalOpen(false);
        setSubOrder(null);
        setVariantToRemove('');
        setVariantToAdd('');
        fetchOrders();
      } else {
        alert(data.error || 'Error procesando la sustitución.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al enviar la sustitución.');
    }
  };

  // Mapeo del Kanban
  // 1. Nuevos/Aceptados -> 'Nuevo', 'Aceptado'
  // 2. En Preparación -> 'Preparando', 'En Preparación'
  // 3. Listos -> 'Listo', 'Listo para Retiro', 'Listo para Despacho'
  // 4. Enviados / Camino -> 'En Ruta', 'En Camino', 'Entregado'
  const filterOrdersForKanban = (columnStatus: OrderStatus) => {
    return orders.filter(o => {
      const s = o.status;
      if (columnStatus === 'Nuevo') {
        return s === 'Nuevo' || s === 'Aceptado';
      }
      if (columnStatus === 'Preparación') {
        return s === 'Preparando' || s === 'En Preparación';
      }
      if (columnStatus === 'Listo') {
        return s === 'Listo' || s === 'Listo para Retiro' || s === 'Listo para Despacho';
      }
      if (columnStatus === 'Enviado') {
        return s === 'En Ruta' || s === 'En Camino' || s === 'Entregado';
      }
      return false;
    });
  };

  // Pedidos incompletos para la pestaña de excepciones
  const incompleteOrders = orders.filter(o => o.status === 'Incompleto');

  const columns: { title: string; status: OrderStatus; icon: any }[] = [
    { title: 'Nuevos Pedidos', status: 'Nuevo', icon: Clock },
    { title: 'En Preparación', status: 'Preparación', icon: Package },
    { title: 'Listos para Entrega', status: 'Listo', icon: CheckCircle },
    { title: 'Despachados / Entregados', status: 'Enviado', icon: Truck },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-charcoal-light p-4 rounded-xl border border-charcoal-border shadow-lg">
        <div>
          <h1 className="text-xl font-serif text-white tracking-wide flex items-center gap-2">
            Control Operativo de Pedidos
            {isLive ? (
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse" title="Conectado a MySQL" />
            ) : (
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" title="Offline" />
            )}
          </h1>
          <p className="text-xs text-gray-400">Pipelines de producción y excepciones de stock</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={fetchOrders} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] text-gray-400 hover:text-white border border-white/5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-charcoal-border">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'kanban' 
              ? 'border-gold text-gold bg-gold/5' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Tablero Kanban
        </button>
        <button
          onClick={() => setActiveTab('exceptions')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'exceptions' 
              ? 'border-gold text-gold bg-gold/5' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Excepciones de Stock
          {incompleteOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-[#0c0c0c] animate-bounce">
              {incompleteOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Kanban */}
      {activeTab === 'kanban' && (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6">
          {columns.map(col => {
            const colOrders = filterOrdersForKanban(col.status);
            const Icon = col.icon;
            
            return (
              <div key={col.status} className="w-80 flex-shrink-0 flex flex-col bg-[#111] rounded-lg border border-charcoal-border">
                {/* Cabecera Columna */}
                <div className="p-4 border-b border-charcoal-border flex items-center justify-between bg-charcoal-light/30 rounded-t-lg">
                  <div className="flex items-center gap-2 text-gray-200 font-semibold text-xs uppercase tracking-wider">
                    <Icon className="w-4 h-4 text-gold" />
                    {col.title}
                  </div>
                  <span className="bg-[#1c1c1c] text-gold border border-gold/20 text-[10px] font-bold py-1 px-2.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>
                
                {/* Contenido Columna */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[60vh]">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-600 italic">No hay pedidos</div>
                  ) : (
                    colOrders.map(order => {
                      const isDelivery = order.shippingMethod === 'Delivery';
                      const isRetiro = order.shippingMethod === 'Retiro';
                      
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-charcoal-light p-4 rounded-lg border border-charcoal-border cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-black/40 group relative overflow-hidden"
                        >
                          {/* SLA Timer para Retiro */}
                          {isRetiro && (order.status !== 'Entregado' && order.status !== 'Cancelado') && (
                            <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                              <SlaTimer 
                                startedAt={order.slaStartedAt} 
                                pausedAt={order.slaPausedAt} 
                                pausedTime={order.slaPausedTime} 
                                status={order.status} 
                              />
                            </div>
                          )}

                          {/* ID y Tipo de Envío */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-white group-hover:text-gold transition-colors">
                              #{order.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                              isDelivery 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'bg-gold/10 text-gold border border-gold/20'
                            }`}>
                              {isDelivery ? 'Delivery' : 'Retiro'}
                            </span>
                          </div>
                          
                          {/* Info Cliente */}
                          <p className="text-xs text-gray-300 font-medium mb-1">{order.customerName}</p>
                          
                          {/* Items */}
                          <div className="text-[11px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                            {order.items.join(', ')}
                          </div>
                          
                          {/* Footer Tarjeta */}
                          <div className="flex justify-between items-center pt-3 border-t border-charcoal-border/50">
                            <span className="text-white font-serif font-bold text-sm">
                              ${order.total.toLocaleString()}
                            </span>
                            
                            {/* Botones de Acción */}
                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                              
                              {/* Botones columna: Nuevo */}
                              {col.status === 'Nuevo' && (
                                <button 
                                  onClick={() => moveOrder(order.id, 'Preparando')} 
                                  className="text-[9px] bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded hover:bg-gold hover:text-black transition-colors font-bold uppercase tracking-wider"
                                >
                                  Aceptar
                                </button>
                              )}
                              
                              {/* Botones columna: En Preparación */}
                              {col.status === 'Preparación' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      const next = isDelivery ? 'Listo para Despacho' : 'Listo para Retiro';
                                      moveOrder(order.id, next);
                                    }} 
                                    className="text-[9px] bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded hover:bg-gold hover:text-black transition-colors font-bold uppercase tracking-wider"
                                  >
                                    Terminar
                                  </button>
                                  <button 
                                    onClick={() => moveOrder(order.id, 'Incompleto')} 
                                    className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors font-bold uppercase"
                                    title="Falta stock en cocina"
                                  >
                                    Falta Stock
                                  </button>
                                </>
                              )}
                              
                              {/* Botones columna: Listos */}
                              {col.status === 'Listo' && (
                                <button 
                                  onClick={() => {
                                    if (isDelivery) {
                                      moveOrder(order.id, 'En Camino');
                                    } else {
                                      moveOrder(order.id, 'Entregado');
                                    }
                                  }} 
                                  className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/30 px-2.5 py-1 rounded hover:bg-green-500 hover:text-black transition-colors font-bold uppercase tracking-wider"
                                >
                                  {isDelivery ? 'Despachar' : 'Entregar'}
                                </button>
                              )}

                              {/* Botones columna: Enviado (Solo Delivery 'En Camino') */}
                              {col.status === 'Enviado' && order.status === 'En Camino' && (
                                <button 
                                  onClick={() => {
                                    setPinOrderId(order.id);
                                    setIsPinModalOpen(true);
                                  }} 
                                  className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded hover:bg-blue-500 hover:text-white transition-colors font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Confirmar PIN
                                </button>
                              )}
                              
                              {/* Estado Entregado fijo */}
                              {order.status === 'Entregado' && (
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Entregado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Excepciones de Stock */}
      {activeTab === 'exceptions' && (
        <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-serif text-white tracking-wide">Pedidos Incompletos (Falta de Stock)</h2>
            <p className="text-xs text-gray-500">Pedidos en pausa de SLA esperando sustitución del producto por parte del administrador.</p>
          </div>
          
          {incompleteOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 italic">No hay pedidos incompletos en cola de sustitución.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-border text-gray-400 uppercase tracking-wider text-[10px] bg-charcoal-light/20">
                    <th className="p-4">Pedido ID</th>
                    <th className="p-4">Cliente / Contacto</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Productos en la Orden</th>
                    <th className="p-4">SLA Pausado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteOrders.map(order => (
                    <tr key={order.id} className="border-b border-charcoal-border/50 hover:bg-charcoal-light/10 transition-colors">
                      <td className="p-4 font-bold text-white">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 space-y-1">
                        <p className="font-semibold text-gray-200">{order.customerName}</p>
                        <p className="text-[10px] text-gray-500">{order.email}</p>
                        <p className="text-[10px] text-gray-500">{order.phone}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                          order.shippingMethod === 'Delivery' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-gold/10 text-gold border border-gold/20'
                        }`}>
                          {order.shippingMethod}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                          {order.itemsRaw?.map((it, idx) => (
                            <li key={idx}>
                              {it.quantity}x {it.productName} ({it.variantName})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-4">
                        <SlaTimer 
                          startedAt={order.slaStartedAt} 
                          pausedAt={order.slaPausedAt} 
                          pausedTime={order.slaPausedTime} 
                          status={order.status} 
                        />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => {
                              setSubOrder(order);
                              setIsSubModalOpen(true);
                            }}
                            className="bg-gold hover:bg-gold-hover text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-md shadow-gold/10"
                          >
                            Sustituir
                          </button>
                          
                          {/* WhatsApp Link Directo */}
                          <a
                            href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(order.customerName)},%20te%20escribimos%20de%20Pan%20de%20Rey%20sobre%20tu%20pedido%20%23${order.id.substring(0, 8).toUpperCase()}.%20Lamentablemente%20no%20contamos%20con%20stock%20de%20uno%20de%20los%20productos.%20¿Te%20gustaría%20cambiarlo%20por%20otro%20del%20mismo%20valor?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Ingresar PIN de Delivery */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-sm rounded-lg border border-charcoal-border shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-gold">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-serif text-white">Validación de Entrega</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              El cliente recibió un PIN de seguridad de 4 dígitos vía WhatsApp al momento de salir el repartidor. Ingrésalo a continuación para confirmar la entrega del pedido.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">PIN del Cliente (4 dígitos)</label>
                <input 
                  type="text" 
                  maxLength={4}
                  placeholder="Ej: 1234"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-center text-xl font-mono tracking-[0.5em] text-white focus:border-gold outline-none transition-colors"
                />
              </div>
              
              {pinError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 bg-red-500/10 p-2 rounded border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pinError}
                </p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded text-xs font-bold uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => moveOrder(pinOrderId, 'Entregado', enteredPin)}
                  disabled={enteredPin.length < 4}
                  className="flex-1 bg-gold text-black py-2.5 rounded text-xs font-bold uppercase hover:bg-gold-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Entregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Sustitución */}
      {isSubModalOpen && subOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubstituteSubmit} className="bg-charcoal-light w-full max-w-lg rounded-lg border border-charcoal-border shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-gold">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-lg font-serif text-white">Sustitución de Producto</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Modifica los ítems del pedido <strong>#{subOrder.id.substring(0, 8).toUpperCase()}</strong>. Se devolverá la cantidad al stock del producto quitado y se descontará del stock del producto de reemplazo.
            </p>
            
            <div className="space-y-4">
              {/* Seleccionar Producto a Quitar */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">1. Producto Faltante (Remover)</label>
                <select 
                  required
                  value={variantToRemove}
                  onChange={(e) => setVariantToRemove(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-sm text-white focus:border-gold outline-none appearance-none"
                >
                  <option value="">Selecciona el producto agotado...</option>
                  {subOrder.itemsRaw?.map(it => (
                    <option key={it.variantId} value={it.variantId}>
                      {it.quantity}x {it.productName} ({it.variantName}) - ${it.price.toLocaleString()} c/u
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Seleccionar Producto Reemplazo */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">2. Producto de Reemplazo (Añadir)</label>
                <select 
                  required
                  value={variantToAdd}
                  onChange={(e) => setVariantToAdd(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-sm text-white focus:border-gold outline-none appearance-none"
                >
                  <option value="">Selecciona el producto sustituto...</option>
                  {productVariantsCatalog
                    .filter(v => v.id !== variantToRemove) // No duplicar
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} - ${v.price.toLocaleString()}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="bg-gold/5 border border-gold/15 p-3 rounded flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-gold">Soporte Operativo:</strong> Al confirmar la sustitución, el SLA en pausa se calculará y registrará en la orden. El estado del pedido se actualizará automáticamente a <strong>{subOrder.shippingMethod === 'Delivery' ? 'Listo para Despacho' : 'Listo para Retiro'}</strong> y el pedido regresará al tablero Kanban principal.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsSubModalOpen(false);
                    setSubOrder(null);
                    setVariantToRemove('');
                    setVariantToAdd('');
                  }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded text-xs font-bold uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-gold text-black py-2.5 rounded text-xs font-bold uppercase hover:bg-gold-hover transition-colors shadow-lg shadow-gold/10"
                >
                  Procesar Reemplazo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Detalle General */}
      {selectedOrder && !isPinModalOpen && !isSubModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-lg rounded-lg border border-charcoal-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-charcoal-border flex justify-between items-center bg-charcoal-light/25 rounded-t-lg">
              <h2 className="text-lg text-white font-serif tracking-wide">Pedido #{selectedOrder.id.substring(0, 8).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white font-bold text-sm">Cerrar</button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Cliente</p>
                  <p className="text-white font-medium text-xs mt-0.5">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Método de Envío</p>
                  <p className="text-gold font-medium text-xs mt-0.5">{selectedOrder.shippingMethod === 'Delivery' ? 'Envío a Domicilio' : 'Retiro en Tienda'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Contacto</p>
                  <p className="text-white text-xs mt-0.5">Email: {selectedOrder.email}</p>
                  <p className="text-white text-xs">Tel: {selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Estado Actual</p>
                  <span className="inline-block bg-[#161616] text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded mt-1">
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
              
              {selectedOrder.deliveryPin && selectedOrder.shippingMethod === 'Delivery' && (
                <div className="bg-blue-500/5 border border-blue-500/15 p-3 rounded flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">PIN de Seguridad Delivery</p>
                    <p className="text-xs text-gray-400">Usa este PIN para confirmar la entrega del repartidor.</p>
                  </div>
                  <span className="text-xl font-mono font-bold text-white bg-blue-500/20 border border-blue-500/35 px-4 py-1 rounded tracking-[0.2em]">{selectedOrder.deliveryPin}</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-charcoal-border">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Detalle de Productos</p>
                <div className="bg-[#161616] border border-white/5 rounded p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-center">Cant</th>
                        <th className="pb-2 text-right">Precio</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.itemsRaw?.map((it, idx) => (
                        <tr key={idx} className="border-b border-white/5 last:border-b-0">
                          <td className="py-2 text-gray-300 font-medium">{it.productName} <span className="text-[10px] text-gray-500">({it.variantName})</span></td>
                          <td className="py-2 text-center text-white">{it.quantity}</td>
                          <td className="py-2 text-right text-gray-400">${it.price.toLocaleString()}</td>
                          <td className="py-2 text-right text-white font-bold">${it.subtotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="pt-4 border-t border-charcoal-border flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total del Pedido</p>
                <p className="text-2xl text-gold font-serif font-bold">${selectedOrder.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
