'use client';

import { Package } from 'lucide-react';
import Link from 'next/link';

export default function OrdersTab() {
  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <div className="mb-10 pb-4 border-b border-white/10">
        <h2 className="font-serif text-3xl text-white italic tracking-wide">Mis Pedidos</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-12 text-center bg-[#161616]/50">
        <Package className="w-16 h-16 text-gray-500 mb-6" />
        <p className="font-serif text-xl text-gray-300 italic mb-8">Aún no has realizado ninguna compra.</p>
        
        <Link 
          href="/shop" 
          className="text-xs font-bold uppercase tracking-widest text-gold hover:text-white hover:bg-gold/10 px-6 py-3 rounded-md transition-colors"
        >
          Explorar Tienda
        </Link>
      </div>
    </div>
  );
}
