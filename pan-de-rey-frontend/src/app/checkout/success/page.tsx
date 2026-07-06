'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { formatPrice } from '@/utils/format';

interface OrderDetails {
  orderId: string;
  total: number;
  paymentMethod: string;
  email: string;
  firstName: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [orderInfo, setOrderInfo] = useState<OrderDetails | null>(null);
  
  // Mercado Pago params
  const paymentId = searchParams.get('payment_id');
  const paymentStatus = searchParams.get('status');
  const preferenceId = searchParams.get('preference_id');

  useEffect(() => {
    // Intentar recuperar los detalles del pedido localmente
    const saved = localStorage.getItem('pan_de_rey_last_order');
    if (saved) {
      try {
        setOrderInfo(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const totalAmount = orderInfo?.total || 15000; // fallback para simulación visual
  const orderIdText = orderInfo?.orderId ? orderInfo.orderId.substring(0, 8) : 'PR-829374';

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-4">
        <div className="w-full max-w-2xl bg-black/45 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-md relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          {/* Decorative Gold Radial Glow */}
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

          {/* Success Checkmark Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-bounce duration-1000">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-wide text-white italic">
              {paymentStatus === 'approved' || !paymentStatus ? '¡Pago Confirmado!' : '¡Pedido Registrado!'}
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">
              Pan de Rey • Masa Madre Premium
            </p>
          </div>

          {/* Order Details Card */}
          <div className="bg-[#121212]/75 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-5 border-b border-white/5">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Código del Pedido</span>
                <span className="font-mono text-sm font-bold text-white uppercase">{orderIdText}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block text-left sm:text-right">Monto Total</span>
                <span className="text-xl font-serif font-bold text-gold">${formatPrice(totalAmount)} CLP</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Método de Pago</span>
                <span className="text-gray-300 font-bold">
                  {orderInfo?.paymentMethod === 'mercadopago' ? 'Mercado Pago (Crédito/Débito)' : 'Transferencia Electrónica'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Estado de Transacción</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                  paymentStatus === 'approved' || !paymentStatus 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {paymentStatus === 'approved' || !paymentStatus ? 'Aprobado' : 'Pendiente'}
                </span>
              </div>
            </div>

            {paymentId && (
              <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-gray-400">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-sans">ID de Pago MP</span>
                  <span>{paymentId}</span>
                </div>
                {preferenceId && (
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-sans">Preferencia MP</span>
                    <span className="truncate block max-w-[200px]">{preferenceId}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Steps / Info */}
          <div className="space-y-4 text-xs text-gray-400 leading-relaxed mb-10">
            <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <ShieldCheck className="w-4.5 h-4.5 text-gold shrink-0 mt-0.5" />
              <p>
                Hemos enviado un correo electrónico de confirmación a <strong className="text-white">{orderInfo?.email || 'tu correo registrado'}</strong> con el ticket detallado y la boleta electrónica correspondiente.
              </p>
            </div>
            <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <HelpCircle className="w-4.5 h-4.5 text-gold shrink-0 mt-0.5" />
              <p>
                Si seleccionaste retiro en tienda, recuerda visitarnos en <strong className="text-white">Av. Antonio Varas 303, Providencia</strong> en el horario acordado. Para despachos, recibirás alertas de ruta por WhatsApp.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Link 
              href="/shop" 
              className="w-full sm:w-auto border border-white/10 hover:border-white/30 text-gray-300 hover:text-white px-6 py-3.5 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingBag className="w-4 h-4" /> Seguir Comprando
            </Link>
            <Link 
              href="/profile" 
              className="w-full sm:w-auto bg-gold hover:bg-gold-hover text-black px-6 py-3.5 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-gold/15"
            >
              Ver mis Pedidos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white text-xs uppercase tracking-widest animate-pulse font-serif">
        Cargando confirmación de pedido...
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
