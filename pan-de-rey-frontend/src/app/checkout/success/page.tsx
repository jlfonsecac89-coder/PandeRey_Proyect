'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, HelpCircle, FileText } from 'lucide-react';
import { formatPrice } from '@/utils/format';

interface OrderDetails {
  orderId: string;
  total: number;
  paymentMethod: string;
  email: string;
  firstName: string;
  boletaNumber?: string | null;
  boletaUrl?: string | null;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [orderInfo, setOrderInfo] = useState<OrderDetails | null>(null);
  
  // Mercado Pago query parameters
  const paymentId = searchParams.get('payment_id');
  const paymentStatus = searchParams.get('status');
  const preferenceId = searchParams.get('preference_id');

  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'failed' | 'not_checked'>('not_checked');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [boletaInfo, setBoletaInfo] = useState<{ number: string | null; url: string | null }>({ number: null, url: null });

  useEffect(() => {
    // 1. Recuperar datos del pedido desde localStorage
    const saved = localStorage.getItem('pan_de_rey_last_order');
    let localOrder: OrderDetails | null = null;
    if (saved) {
      try {
        localOrder = JSON.parse(saved);
        setOrderInfo(localOrder);
        if (localOrder?.boletaNumber) {
          setBoletaInfo({ number: localOrder.boletaNumber, url: localOrder.boletaUrl || null });
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Si viene de Mercado Pago, verificar el pago en el backend en tiempo real (Doble Seguro)
    if (paymentId) {
      setVerificationStatus('loading');
      
      const checkPayment = async () => {
        try {
          const host = window.location.hostname;
          const backendBase = (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:3001' : '';
          
          const res = await fetch(`${backendBase}/api/orders/verify-payment?payment_id=${paymentId}`);
          
          if (!res.ok) {
            throw new Error('Error al verificar el estado de la transacción');
          }
          
          const data = await res.json();
          if (data.status === 'success' || data.paymentStatus === 'approved') {
            setVerificationStatus('success');
            const updatedOrder = {
              ...localOrder,
              orderId: data.orderNumber || localOrder?.orderId || '',
              boletaNumber: data.boletaNumber || localOrder?.boletaNumber || null,
              boletaUrl: data.boletaUrl || localOrder?.boletaUrl || null
            };
            setOrderInfo(updatedOrder as any);
            localStorage.setItem('pan_de_rey_last_order', JSON.stringify(updatedOrder));
            if (data.boletaNumber) {
              setBoletaInfo({ number: data.boletaNumber, url: data.boletaUrl });
            }
          } else {
            setVerificationStatus('failed');
            setVerificationError(`El pago se encuentra en estado: ${data.paymentStatus || 'pendiente o rechazado'}`);
          }
        } catch (err: any) {
          console.warn('[Payment verification fallback]:', err);
          // Si el servidor local está offline o inalcanzable, hacemos fallback amigable si status es approved
          if (paymentStatus === 'approved') {
            setVerificationStatus('success');
          } else {
            setVerificationStatus('failed');
            setVerificationError('No pudimos contactar al servidor para verificar el estado de su pago.');
          }
        }
      };
      
      checkPayment();
    } else {
      setVerificationStatus('success');
    }
  }, [paymentId, paymentStatus]);

  const totalAmount = orderInfo?.total || 15000;
  const orderIdText = orderInfo?.orderId 
    ? (orderInfo.orderId.startsWith('PDR-') ? orderInfo.orderId : orderInfo.orderId.substring(0, 8)) 
    : 'PR-829374';

  // Render para estado cargando verificación
  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-4">
          <div className="w-full max-w-md bg-black/45 border border-white/10 rounded-3xl p-10 text-center backdrop-blur-md relative overflow-hidden shadow-2xl">
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gold/5 blur-[120px] pointer-events-none animate-pulse" />
            <div className="w-16 h-16 border-4 border-t-gold border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-serif font-bold text-white mb-2">Verificando Pago...</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Confirmando con Mercado Pago Pro</p>
          </div>
        </main>
      </div>
    );
  }

  // Render para estado de error o pago rechazado
  if (verificationStatus === 'failed') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-4">
          <div className="w-full max-w-md bg-black/45 border border-white/10 rounded-3xl p-8 md:p-12 text-center backdrop-blur-md relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-black text-white italic mb-2">Pago Rechazado o Incompleto</h2>
            <p className="text-xs text-gray-400 mb-8 leading-relaxed">
              {verificationError || 'Mercado Pago no ha procesado el pago correctamente. Si el dinero fue descontado de tu cuenta, por favor comunícate directamente con nuestro soporte por WhatsApp.'}
            </p>
            <div className="space-y-3">
              <Link 
                href="/checkout" 
                className="block w-full bg-gold hover:bg-gold-hover text-black px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Volver al Checkout
              </Link>
              <Link 
                href="https://wa.me/56912345678" 
                target="_blank"
                className="block w-full border border-white/10 hover:border-white/30 text-gray-300 hover:text-white px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Contactar por WhatsApp
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render para estado exitoso
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
              {paymentStatus === 'approved' || !paymentId ? '¡Pago Confirmado!' : '¡Pedido Registrado!'}
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
                  {orderInfo?.paymentMethod === 'mercadopago' ? 'Mercado Pago (Checkout Pro)' : 'Transferencia Electrónica'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Estado de Transacción</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                  paymentStatus === 'approved' || !paymentId 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {paymentStatus === 'approved' || !paymentId ? 'Aprobado' : 'Pendiente'}
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

            {/* Bloque para descargar la boleta electrónica de Defontana */}
            {boletaInfo.url && (
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-0.5">Boleta Electrónica (ERP)</span>
                  <span className="text-xs font-bold text-gray-300 font-mono">Folio: #{boletaInfo.number}</span>
                </div>
                <a 
                  href={boletaInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-xs font-bold text-gold flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4" /> Ver Boleta Oficial (PDF)
                </a>
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
