"use client";

import { useState } from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

type OrderStatus = 'Nuevo' | 'Preparación' | 'Listo' | 'Enviado';

type Order = {
  id: string;
  customerName: string;
  items: string[];
  total: number;
  status: OrderStatus;
  time: string;
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

  const moveOrder = (id: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const columns: { title: string; status: OrderStatus; icon: any }[] = [
    { title: 'Nuevos Pedidos', status: 'Nuevo', icon: Clock },
    { title: 'En Preparación', status: 'Preparación', icon: Package },
    { title: 'Listos / Retiro', status: 'Listo', icon: CheckCircle },
    { title: 'Enviados', status: 'Enviado', icon: Truck },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Pipeline de Pedidos</h1>
        <p className="text-gray-400">Gestiona el flujo de trabajo de los pedidos activos.</p>
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
                      <span className="text-gold font-medium">${order.total.toFixed(2)}</span>
                      {/* Action Buttons to move */}
                      <div className="flex gap-2">
                        {col.status === 'Nuevo' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Preparación') }} className="text-xs bg-gold/10 text-gold px-2 py-1 rounded-sm hover:bg-gold hover:text-black transition-colors">Preparar</button>
                        )}
                        {col.status === 'Preparación' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Listo') }} className="text-xs bg-gold/10 text-gold px-2 py-1 rounded-sm hover:bg-gold hover:text-black transition-colors">Terminar</button>
                        )}
                        {col.status === 'Listo' && (
                          <button onClick={(e) => { e.stopPropagation(); moveOrder(order.id, 'Enviado') }} className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-sm hover:bg-green-500 hover:text-black transition-colors">Enviar</button>
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
                <p className="text-white">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-400 mt-1">Tel: +54 9 11 1234-5678</p>
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
                <p className="text-sm text-gray-400">Total a cobrar</p>
                <p className="text-xl text-gold font-serif">${selectedOrder.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
