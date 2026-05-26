"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { items, setIsCartOpen } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="fixed top-0 w-full z-40 bg-[#0B0B0B]/80 backdrop-blur-md border-b border-charcoal-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div className="flex items-center gap-12">
            <Link href="/" className="hover:opacity-80 transition-opacity flex items-center">
              <Image src="/logo.png" alt="Pan de Rey Logo" width={80} height={80} className="invert mix-blend-screen" />
            </Link>
            <div className="hidden md:flex space-x-8 items-center">
              <Link href="/" className="text-[10px] font-bold tracking-[0.3em] hover:text-white text-gray-400 transition-colors uppercase">
                INICIO
              </Link>
              <Link href="/shop" className="text-[10px] font-bold tracking-[0.3em] hover:text-white text-gray-400 transition-colors uppercase">
                TIENDA
              </Link>
              <Link href="/#storytelling" className="text-[10px] font-bold tracking-[0.3em] hover:text-white text-gray-400 transition-colors uppercase">
                NOSOTROS
              </Link>
              <Link href="/#contact" className="text-[10px] font-bold tracking-[0.3em] hover:text-white text-gray-400 transition-colors uppercase">
                CONTACTO
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-white hover:text-gold transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-gold text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <Link href="/profile" className="p-2 text-white hover:text-gold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}
