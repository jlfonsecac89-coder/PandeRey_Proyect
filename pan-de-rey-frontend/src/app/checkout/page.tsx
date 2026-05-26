"use client";

import Navbar from '@/components/Navbar';
import CheckoutForm from '@/components/shop/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 px-4 sm:px-6 lg:px-8 w-full">
        <CheckoutForm onComplete={() => alert('¡Pedido completado!')} />
      </main>
    </div>
  );
}
