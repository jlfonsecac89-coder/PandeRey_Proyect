'use client';

import { useState, useEffect } from 'react';
import { getDriverOrders, submitDeliveryPin, DriverOrder } from './actions';
import { Package, MapPin, Phone, User, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';

// TODO: Replace with authenticated driver ID once RBAC is implemented
const MOCK_DRIVER_ID = '00000000-0000-0000-0000-000000000000'; // For testing, backend bypasses driver check if not set or just pass any for now

export default function DriverOrdersPage() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // In a real scenario, this ID comes from the session
      const data = await getDriverOrders(MOCK_DRIVER_ID);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleKeypadPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmitPin = async () => {
    if (pin.length !== 4 || !selectedOrderId) return;
    setValidating(true);
    setMessage(null);
    
    try {
      const result = await submitDeliveryPin(selectedOrderId, pin, MOCK_DRIVER_ID);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => {
          setSelectedOrderId(null);
          setPin('');
          setMessage(null);
          fetchOrders(); // Refresh list to remove the delivered order
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
        setPin(''); // Clear PIN on error
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans pb-20">
      <Navbar />
      
      <div className="max-w-md mx-auto pt-24 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="w-6 h-6 text-gold" />
          <h1 className="text-xl font-serif text-gold uppercase tracking-wider font-bold">Mis Entregas</h1>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10 animate-pulse text-sm">Cargando rutas...</p>
        ) : orders.length === 0 ? (
          <div className="bg-[#121212] p-8 rounded-xl border border-white/5 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No tienes entregas pendientes</p>
            <p className="text-xs text-gray-600 mt-1">Tu ruta está limpia por ahora.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-[#121212] border border-charcoal-border/70 rounded-xl overflow-hidden shadow-lg">
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${order.status === 'En Camino' ? 'bg-amber-900/40 text-amber-500 border-b border-amber-900/50' : 'bg-blue-900/20 text-blue-400 border-b border-blue-900/30'}`}>
                  <span>{order.status}</span>
                  <span>#{order.orderNumber}</span>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <User className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-gray-200">{order.customerName}</p>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">{order.deliveryAddress}</p>
                  </div>
                  <div className="flex gap-3">
                    <Phone className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">{order.customerPhone}</p>
                  </div>
                  
                  <div className="pt-3 flex gap-2">
                    <a href={`tel:${order.customerPhone}`} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/10">
                      <Phone className="w-3.5 h-3.5" /> Llamar
                    </a>
                    <button 
                      onClick={() => setSelectedOrderId(order.id)}
                      disabled={order.status !== 'En Camino'}
                      className={`flex-[2] text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border ${
                        order.status === 'En Camino' 
                          ? 'bg-gold hover:bg-gold/90 text-black border-gold shadow-[0_0_15px_rgba(197,168,128,0.2)]'
                          : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Validar Entrega
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PIN Verification Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] rounded-t-3xl border-t border-charcoal-border p-6 pb-safe animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gold font-bold uppercase tracking-widest text-sm">Validar con PIN</h3>
              <button onClick={() => { setSelectedOrderId(null); setPin(''); setMessage(null); }} className="text-gray-500 hover:text-white p-2">
                ✕
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mb-6">Solicita al cliente su código de 4 dígitos para confirmar la entrega exitosa.</p>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-3xl font-mono border-2 transition-colors ${pin.length === i ? 'border-gold bg-gold/5' : pin[i] ? 'border-white/20 bg-white/5' : 'border-white/5 bg-black/50'}`}>
                  {pin[i] ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Message Alert */}
            {message && (
              <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 text-xs font-bold border ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-red-900/30 text-red-400 border-red-900/50'}`}>
                {message.type === 'error' && <AlertTriangle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleKeypadPress(num.toString())}
                  disabled={validating}
                  className="bg-white/5 active:bg-white/20 hover:bg-white/10 rounded-xl py-4 text-2xl font-light transition-colors border border-white/5"
                >
                  {num}
                </button>
              ))}
              <div className="col-start-2">
                <button 
                  onClick={() => handleKeypadPress('0')}
                  disabled={validating}
                  className="w-full bg-white/5 active:bg-white/20 hover:bg-white/10 rounded-xl py-4 text-2xl font-light transition-colors border border-white/5"
                >
                  0
                </button>
              </div>
              <div className="col-start-3">
                <button 
                  onClick={handleBackspace}
                  disabled={validating}
                  className="w-full h-full bg-white/5 active:bg-white/20 hover:bg-white/10 rounded-xl text-sm font-bold tracking-widest text-gray-400 transition-colors border border-white/5"
                >
                  DEL
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmitPin}
              disabled={pin.length !== 4 || validating}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg ${
                pin.length === 4 && !validating
                  ? 'bg-gold hover:bg-gold/90 text-black shadow-gold/20' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {validating ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
