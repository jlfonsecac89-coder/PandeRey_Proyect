'use client';

import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/utils/format';

export default function CartSidebar() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, total, clearCart } = useCart();

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[100] transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-[#0B0B0B]/85 backdrop-blur-xl shadow-2xl z-[101] flex flex-col transition-transform duration-500 ease-in-out border-l border-white/5 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-charcoal-border bg-[#0B0B0B]">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-gold" />
            <h2 className="font-serif text-2xl text-white tracking-wide">Tu Selección</h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button 
                onClick={clearCart}
                title="Vaciar Carrito"
                className="w-10 h-10 rounded-full border border-charcoal-border flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(false)} 
              title="Cerrar Carrito"
              className="w-10 h-10 rounded-full border border-charcoal-border flex items-center justify-center text-gray-400 hover:text-white hover:border-gold transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <div className="w-16 h-16 bg-charcoal-light rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm uppercase tracking-widest">El carrito está vacío</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-gold text-xs border-b border-gold pb-1 font-bold"
              >
                Explorar Productos
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 group">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-charcoal-light">
                  <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-serif text-lg text-white truncate">{item.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.filling && <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-charcoal-light border border-white/5 text-gold rounded-full">{item.filling}</span>}
                    {item.topping && <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-charcoal-light border border-white/5 text-gold rounded-full">{item.topping}</span>}
                    {item.dietaryType && <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-charcoal-light border border-white/5 text-gold rounded-full">{item.dietaryType}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gold font-bold">${formatPrice(item.price * item.quantity)}</span>
                    <div className="flex items-center border border-charcoal-border rounded-md bg-black">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        className="w-8 h-8 flex items-center justify-center text-gold hover:text-gold-hover transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-8 border-t border-charcoal-border bg-[#050505]">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Total del Pedido</p>
                <p className="text-xs text-gray-600 font-light">Incluye impuestos y preparación</p>
              </div>
              <span className="font-serif text-3xl text-gold">${formatPrice(total)}</span>
            </div>
            
            <div className="space-y-4">
              <Link 
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full flex items-center justify-center gap-3 bg-gold text-black py-5 font-bold uppercase tracking-widest hover:bg-gold-hover hover:scale-[1.02] active:scale-[0.98] transition-all rounded-sm shadow-xl hover:shadow-gold/15 shadow-gold/5"
              >
                Finalizar Pedido
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-full text-center py-4 text-gray-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
