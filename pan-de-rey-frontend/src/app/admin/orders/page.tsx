"use client";

import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

type OrderStatus = 'Nuevo' | 'Preparación' | 'Listo' | 'Enviado';

type Order = {
  id: string;
  customerName: string;
  items: string[];
  total: number;
  status: OrderStatus;
  time: string;
  email?: string;
  phone?: string;
  shippingMethod?: string;
};

const initialOrders: Order[] = [
  { id: '#1001', customerName: 'María G.', items: ['1x Masa Madre Clásico', '2x Croissant'], total: 18.50, status: 'Nuevo', time: '10:30 AM' },
  { id: '#1002', customerName: 'Juan P.', items: ['1x Focaccia'], total: 12.00, status: 'Nuevo', time: '10:45 AM' },
  { id: '#0999', customerName: 'Ana L.', items: ['1x Pan Semillas', '1x Baguette'], total: 15.00, status: 'Preparación', time: '10:15 AM' },
  { id: '#0998', customerName: 'Carlos D.', items: ['3x Pain au Choc'], total: 9.00, status: 'Listo', time: '09:50 AM' },
];

export default function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/orders');
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      
      setIsLive(true);
      
      // Map statuses from DB to Frontend Kanban categories
      const mapped = data.map((o: any) => {
        let kanbanStatus: OrderStatus = 'Nuevo';
        if (o.status === 'Preparando') kanbanStatus = 'Preparación';
        else if (o.status === 'Listo' || o.status === 'Listo para Retiro') kanbanStatus = 'Listo';
        else if (o.status === 'En Ruta' || o.status === 'Entregado') kanbanStatus = 'Enviado';
        
        return {
          id: o.id.substring(0, 8).toUpperCase(), // Display short UUID
          realId: o.id, // Keep full UUID for API calls
          customerName: o.customerName,
          email: o.email,
          phone: o.phone,
          items: o.items,
          total: o.total,
          status: kanbanStatus,
          time: o.time,
          shippingMethod: o.shippingMethod
        };
      });
      
      // Filter out 'Cancelado' to keep board clean
      const active = mapped.filter((o: any) => o.status !== 'Cancelado');
      setOrders(active);
    } catch (err) {
      console.warn('Orders API not available, falling back to mock data:', err);
      setIsLive(false);
      setOrders(initialOrders);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const moveOrder = async (id: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (isLive && order && (order as any).realId) {
      const realId = (order as any).realId;
      
      // Map Kanban status back to DB status
      let dbStatus = 'Nuevo';
      if (newStatus === 'Preparación') dbStatus = 'Preparando';
      else if (newStatus === 'Listo') {
        dbStatus = order.shippingMethod === 'Delivery' ? 'Listo' : 'Listo para Retiro';
      }
      else if (newStatus === 'Enviado') {
        dbStatus = order.shippingMethod === 'Delivery' ? 'En Ruta' : 'Entregado';
      }
      
      try {
        const res = await fetch('http://localhost:3001/api/orders/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: realId,
            newStatus: dbStatus
          })
        });
        
        if (res.ok) {
          fetchOrders();
        } else {
          alert('Error al actualizar el estado en el servidor');
        }
      } catch (err) {
        console.error('Failed to update status:', err);
        alert('Error de conexión al actualizar estado');
      }
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    }
  };

  const columns: { title: string; status: OrderStatus; icon: any }[] = [
    { title: 'Nuevos Pedidos', status: 'Nuevo', icon: Clock },
    { title: 'En Preparación', status: 'Preparación', icon: Package },
    { title: 'Listos / Retiro', status: 'Listo', icon: CheckCircle },
    { title: 'Enviados', status: 'Enviado', icon: Truck },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
            Pipeline de Pedidos
            {isLive && (
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse" title="Conexión en vivo con base de datos" />
            )}
          </h1>
          <p className="text-gray-400 text-sm">Gestiona el flujo de trabajo de los pedidos activos.</p>
        </div>
        {isLive && (
          <button 
            onClick={fetchOrders} 
            className="px-3 py-1.5 bg-[#161616] text-gray-400 hover:text-white border border-white/5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Sincronizar
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col.status);
          const Icon = col.icon;
          
          return (
            <div key={col.status} className="w-80 flex-shrink-0 flex flex-col bg-[#141414] rounded-sm border border-charcoal-border">
              <div className="p-4 border-b border-charcoal-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-200 font-medium">
                  <Icon className="w-4 h-4 text-gold" />
                  {col.title}
                </div>
                <span className="bg-charcoal-light text-xs py-1 px-2 rounded-full border border-charcoal-border">{colOrders.length}</span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {colOrders.map(order => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="bg-charcoal-light p-4 rounded-sm border border-charcoal-border cursor-pointer hover:border-gold transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-white">{order.id}</span>
                      <span className="text-xs text-gray-400">{order.time}</span>
                    </div>
                    <p className="text-sm text-gray-300 font-medium mb-2">{order.customerName}</p>
                    <div className="text-xs text-gray-500 mb-4 line-clamp-2">
                      {order.items.join(', ')}
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-charcoal-border/50">
                      <span className="text-gold font-medium">${order.total.toLocaleString()}</span>
                      {/* Action Buttons to move */}
                      <div className="flex gap-2">
                        {col.status === 'Nuevo' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Preparación') }} className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded-sm hover:bg-gold hover:text-black transition-colors font-bold uppercase">Preparar</button>
                        )}
                        {col.status === 'Preparación' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Listo') }} className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded-sm hover:bg-gold hover:text-black transition-colors font-bold uppercase">Terminar</button>
                        )}
                        {col.status === 'Listo' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Enviado') }} className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-sm hover:bg-green-500 hover:text-black transition-colors font-bold uppercase">{order.shippingMethod === 'Delivery' ? 'Despachar' : 'Entregar'}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Detalle (Simple) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-lg rounded-sm border border-charcoal-border shadow-2xl flex flex-col">
            <div className="p-6 border-b border-charcoal-border flex justify-between items-center">
              <h2 className="text-xl text-white font-medium">Pedido {selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">Cerrar</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-400">Cliente</p>
                <p className="text-white font-medium">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-400 mt-1">Email: {selectedOrder.email || 'No Registrado'}</p>
                <p className="text-sm text-gray-400">Tel: {selectedOrder.phone || 'No Registrado'}</p>
                {selectedOrder.shippingMethod && (
                  <p className="text-sm text-gray-400">Tipo de Envío: {selectedOrder.shippingMethod === 'Delivery' ? 'Despacho a Domicilio' : 'Retiro en Tienda'}</p>
                )}
              </div>
              <div className="pt-4 border-t border-charcoal-border">
                <p className="text-sm text-gray-400 mb-2">Items</p>
                <ul className="space-y-1">
                  {selectedOrder.items.map((item, i) => (
                    <li key={i} className="text-white text-sm">{item}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-charcoal-border flex justify-between">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-xl text-gold font-serif">${selectedOrder.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
