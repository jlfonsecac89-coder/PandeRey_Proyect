'use client';

import { useState } from 'react';
import { Package, Calendar, ChevronDown, ChevronUp, RefreshCw, Check, Truck, Store, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '../../../context/CartContext';
import { formatPrice } from '../../../utils/format';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface MockOrder {
  id: string;
  date: string;
  status: 'Entregado' | 'Preparando' | 'Listo';
  shippingMethod: 'Delivery' | 'Retiro';
  address?: string;
  storeName?: string;
  items: OrderItem[];
  shippingCost: number;
  total: number;
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: '1042',
    date: '12 de Mayo, 2026',
    status: 'Entregado',
    shippingMethod: 'Delivery',
    address: 'Av. Vitacura 3560, Dpto 802, Vitacura',
    items: [
      {
        productId: '1',
        name: 'Pan de Masa Madre Clásico',
        price: 4500,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
      },
      {
        productId: '6',
        name: 'Croissant de Mantequilla',
        price: 2200,
        quantity: 2,
        imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
      },
      {
        productId: '14',
        name: 'Espresso Doble',
        price: 2200,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
      }
    ],
    shippingCost: 3500,
    total: 14600
  },
  {
    id: '1029',
    date: '28 de Abril, 2026',
    status: 'Entregado',
    shippingMethod: 'Retiro',
    storeName: 'Local Principal (Providencia - Av. Nueva Providencia 2155)',
    items: [
      {
        productId: '8',
        name: 'Tarta de Limón y Merengue',
        price: 3800,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80',
      },
      {
        productId: '15',
        name: 'Cappuccino Italiano',
        price: 3200,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80',
      }
    ],
    shippingCost: 0,
    total: 7000
  },
  {
    id: '0985',
    date: '15 de Marzo, 2026',
    status: 'Entregado',
    shippingMethod: 'Retiro',
    storeName: 'Local Principal (Providencia - Av. Nueva Providencia 2155)',
    items: [
      {
        productId: '19',
        name: 'Pack Familiar Brunch',
        price: 15000,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80&sat=-1',
      }
    ],
    shippingCost: 0,
    total: 15000
  }
];

export default function OrdersTab() {
  const { addToCart, setIsCartOpen } = useCart();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleRepeatOrder = async (order: MockOrder) => {
    if (repeatingId) return;
    setRepeatingId(order.id);
    
    try {
      // Add all products sequentially
      for (const item of order.items) {
        await addToCart({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        });
      }
      
      // Visual feedback
      setSuccessId(order.id);
      setTimeout(() => {
        setSuccessId(null);
      }, 2000);
      
      // Auto open cart drawer
      setIsCartOpen(true);
    } catch (err) {
      console.error('Error repeating order:', err);
    } finally {
      setRepeatingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Listo':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Preparando':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Entregado':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <div className="mb-10 pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-white italic tracking-wide">Mis Pedidos</h2>
          <p className="text-xs text-gray-500 mt-1">Revisa el historial de tus compras y repite tus pedidos favoritos con un clic.</p>
        </div>
        <Link 
          href="/shop" 
          className="self-start sm:self-center text-[10px] font-bold uppercase tracking-widest text-gold hover:text-white border border-gold/30 hover:border-gold px-4 py-2 rounded-lg transition-all duration-300 bg-gold/5"
        >
          Explorar Tienda
        </Link>
      </div>

      <div className="space-y-6">
        {MOCK_ORDERS.map((order) => {
          const isExpanded = expandedOrders[order.id] || false;
          const isRepeating = repeatingId === order.id;
          const isSuccess = successId === order.id;
          const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

          return (
            <div 
              key={order.id} 
              className="bg-[#141414]/80 border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all duration-300 shadow-md"
            >
              {/* Order Main Header */}
              <div 
                onClick={() => toggleExpand(order.id)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer select-none"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-gold border border-white/5">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-widest text-white">Pedido #{order.id}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        {order.date}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="flex items-center gap-1 font-medium">
                        {order.shippingMethod === 'Delivery' ? (
                          <>
                            <Truck className="w-3.5 h-3.5 text-gold/80" />
                            Envío a domicilio
                          </>
                        ) : (
                          <>
                            <Store className="w-3.5 h-3.5 text-gold/80" />
                            Retiro en Tienda
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t border-white/5 md:border-0">
                  <div className="md:text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total</p>
                    <p className="text-xl font-serif font-black text-gold">${formatPrice(order.total)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRepeatOrder(order);
                      }}
                      disabled={isRepeating}
                      className={`h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 border ${
                        isSuccess
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-gold hover:bg-white text-black hover:text-black border-gold hover:border-white shadow-lg shadow-gold/10'
                      }`}
                    >
                      {isRepeating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Añadiendo...
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          ¡Añadido!
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Repetir Pedido
                        </>
                      )}
                    </button>
                    <button 
                      className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
                      aria-label="Ver detalles"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Thumbnails Summary (Visible when collapsed) */}
              {!isExpanded && (
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="px-6 pb-6 pt-0 border-t border-white/[0.03] flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="relative shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute -bottom-1 -right-1 bg-black/80 border border-white/10 text-[9px] font-bold text-white px-1 rounded-md min-w-[14px] text-center">
                          {item.quantity}
                        </span>
                      </div>
                    ))}
                    <span className="text-[11px] text-gray-500 ml-2">
                      {totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'} en total
                    </span>
                  </div>
                  <span className="text-[10px] text-gold hover:text-white font-bold uppercase tracking-widest transition-colors hidden sm:inline-block">
                    Ver Detalles &darr;
                  </span>
                </div>
              )}

              {/* Expandable Order Details */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-black/40 px-6 py-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Items list */}
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Detalle del Pedido</p>
                    <div className="divide-y divide-white/5">
                      {order.items.map((item) => (
                        <div key={item.productId} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-white/5 relative shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {item.quantity} x ${formatPrice(item.price)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-white">${formatPrice(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping/Retiro and pricing grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    {/* Delivery / Pickup address info */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Método de Entrega</p>
                      <div className="bg-[#1c1c1c]/50 border border-white/5 rounded-xl p-4 flex gap-3">
                        <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold text-white">
                            {order.shippingMethod === 'Delivery' ? 'Despacho a Domicilio' : 'Retiro en Tienda'}
                          </p>
                          <p className="text-gray-400 mt-1 leading-relaxed">
                            {order.shippingMethod === 'Delivery' ? order.address : order.storeName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cost summary */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold md:text-right">Resumen de Pago</p>
                      <div className="space-y-1.5 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="text-white">${formatPrice(order.total - order.shippingCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Despacho</span>
                          <span className="text-white">
                            {order.shippingCost > 0 ? `$${formatPrice(order.shippingCost)}` : 'Gratis'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/5 font-bold text-sm">
                          <span className="text-white">Total Pagado</span>
                          <span className="text-gold">${formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
