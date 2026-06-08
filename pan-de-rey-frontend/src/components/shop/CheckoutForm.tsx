'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Check, Mail, Lock, User, Calendar, FileText, Smartphone } from 'lucide-react';
import { formatPrice } from '@/utils/format';
import TermsAndConditions from './TermsAndConditions';

type AuthMode = 'selection' | 'guest' | 'login' | 'register';

export default function CheckoutForm({ onComplete }: { onComplete: () => void }) {
  const { items, total } = useCart();
  
  const [authMode, setAuthMode] = useState<AuthMode>('selection');
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    rut: '',
    phone: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    acceptTerms: false,
    deliveryMethod: 'store_pickup', // 'store_pickup' | 'own_delivery'
    paymentMethod: 'mercadopago' // 'mercadopago' | 'transfer'
  });

  const [activeStep, setActiveStep] = useState(1);

  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'register' && !formData.acceptTerms) {
      alert('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }
    
    if (authMode === 'login' && (!formData.email || !formData.password)) {
      alert('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    if (authMode === 'guest' && (!formData.email || !formData.firstName)) {
      alert('Por favor, ingresa tu nombre y correo.');
      return;
    }

    if (authMode === 'register' && (!formData.email || !formData.firstName || !formData.lastName || !formData.password)) {
      alert('Por favor, completa los campos obligatorios marcados con asterisco.');
      return;
    }

    // Si todo está bien, pasamos al paso 2
    setActiveStep(2);
  };

  return (
    <>
      <TermsAndConditions isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      
      <div className="max-w-6xl mx-auto pb-12">
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-12 text-white italic tracking-wide">
          Finalizar Compra
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Form Steps */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Identificación */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 md:p-8 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${activeStep > 1 ? 'bg-gold text-black' : 'bg-white/10 text-gray-400'}`}>
                  {activeStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <h2 className="text-xl font-serif text-white tracking-wide">Identificación</h2>
              </div>
              
              {activeStep === 1 ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  {authMode === 'selection' && (
                    <div className="space-y-4">
                      <p className="text-gray-400 text-sm mb-6">¿Cómo deseas continuar con tu compra?</p>
                      
                      <button onClick={() => setAuthMode('login')} className="w-full bg-[#161616] border border-white/10 hover:border-gold/50 text-white p-4 rounded-md flex justify-between items-center transition-all group">
                        <span className="font-bold tracking-wide flex items-center gap-3"><User className="w-5 h-5 text-gold" /> Iniciar Sesión</span>
                        <span className="text-xs text-gray-500 group-hover:text-gold transition-colors">Tengo una cuenta</span>
                      </button>

                      <button onClick={() => setAuthMode('register')} className="w-full bg-[#161616] border border-white/10 hover:border-gold/50 text-white p-4 rounded-md flex justify-between items-center transition-all group">
                        <span className="font-bold tracking-wide flex items-center gap-3"><Mail className="w-5 h-5 text-gold" /> Crear Cuenta</span>
                        <span className="text-xs text-gray-500 group-hover:text-gold transition-colors">Nuevo cliente</span>
                      </button>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-[#0f0f0f] px-2 text-gray-500 uppercase tracking-widest">o</span></div>
                      </div>

                      <button onClick={() => setAuthMode('guest')} className="w-full border border-white/10 hover:bg-white/5 text-gray-300 p-4 rounded-md flex justify-center items-center transition-all text-sm font-bold tracking-widest uppercase">
                        Comprar sin registrarse
                      </button>
                    </div>
                  )}

                  {authMode === 'login' && (
                    <form onSubmit={handleStep1Submit} className="space-y-5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold tracking-wide">Ingresa a tu cuenta</h3>
                        <button type="button" onClick={() => setAuthMode('selection')} className="text-xs text-gray-500 hover:text-white underline">Volver</button>
                      </div>

                      <button type="button" className="w-full bg-white text-black font-bold p-3 rounded-md flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continuar con Google
                      </button>

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-[#0f0f0f] px-2 text-gray-500 uppercase tracking-widest">o usa tu email</span></div>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Correo electrónico" className="w-full bg-[#161616] border border-white/10 pl-12 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Contraseña" className="w-full bg-[#161616] border border-white/10 pl-12 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-gold hover:bg-gold-hover text-black px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors w-full sm:w-auto">
                          Ingresar
                        </button>
                      </div>
                    </form>
                  )}

                  {authMode === 'guest' && (
                    <form onSubmit={handleStep1Submit} className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold tracking-wide">Comprar como Invitado</h3>
                        <button type="button" onClick={() => setAuthMode('selection')} className="text-xs text-gray-500 hover:text-white underline">Volver</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Nombre completo" className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Correo electrónico" className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                      </div>
                      <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-[#333333] hover:bg-gold hover:text-black text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors w-full sm:w-auto">
                          Continuar
                        </button>
                      </div>
                    </form>
                  )}

                  {authMode === 'register' && (
                    <form onSubmit={handleStep1Submit} className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold tracking-wide">Crear Nueva Cuenta</h3>
                        <button type="button" onClick={() => setAuthMode('selection')} className="text-xs text-gray-500 hover:text-white underline">Volver</button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
                          <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Apellido *</label>
                          <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Correo Electrónico *</label>
                          <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Contraseña *</label>
                          <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><FileText className="w-3 h-3"/> RUT (Opcional)</label>
                          <input name="rut" value={formData.rut} onChange={handleInputChange} placeholder="Ej: 12.345.678-9" className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Smartphone className="w-3 h-3"/> Teléfono (Opcional)</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+56 9 1234 5678" className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none transition-colors" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3"/> Fecha de Nacimiento (Opcional)</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select name="birthDay" value={formData.birthDay} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none appearance-none">
                            <option value="">Día</option>
                            {Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                          </select>
                          <select name="birthMonth" value={formData.birthMonth} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none appearance-none">
                            <option value="">Mes</option>
                            <option value="1">Ene</option><option value="2">Feb</option><option value="3">Mar</option>
                            <option value="4">Abr</option><option value="5">May</option><option value="6">Jun</option>
                            <option value="7">Jul</option><option value="8">Ago</option><option value="9">Sep</option>
                            <option value="10">Oct</option><option value="11">Nov</option><option value="12">Dic</option>
                          </select>
                          <select name="birthYear" value={formData.birthYear} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 p-3 rounded-md text-white focus:border-gold outline-none appearance-none">
                            <option value="">Año</option>
                            {Array.from({length: 100}, (_, i) => {
                              const year = new Date().getFullYear() - i - 18; // Must be 18+ realistically or just general list
                              return <option key={year} value={year}>{year}</option>
                            })}
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 pb-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center pt-0.5">
                            <input 
                              type="checkbox" 
                              name="acceptTerms" 
                              checked={formData.acceptTerms} 
                              onChange={handleInputChange} 
                              className="peer sr-only"
                            />
                            <div className="w-5 h-5 rounded border border-white/30 bg-[#161616] peer-checked:bg-gold peer-checked:border-gold transition-colors flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 select-none pt-0.5">
                            He leído y acepto los <button type="button" onClick={() => setIsTermsOpen(true)} className="text-gold hover:underline font-bold">Términos, Condiciones y Políticas de Privacidad</button>.
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-gold hover:bg-gold-hover text-black px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors w-full sm:w-auto">
                          Crear Cuenta y Continuar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center bg-[#161616] border border-white/5 p-4 rounded-md animate-in fade-in">
                  <div>
                    <p className="text-white font-bold text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-gold" />
                      {formData.firstName} {authMode === 'register' ? formData.lastName : ''}
                    </p>
                    <p className="text-gray-500 text-sm ml-6">{formData.email}</p>
                  </div>
                  <button onClick={() => setActiveStep(1)} className="text-gold text-xs uppercase font-bold tracking-widest hover:underline px-4 py-2">
                    Editar
                  </button>
                </div>
              )}
            </div>

          {/* Step 2: Opciones de Entrega */}
          <div className={`bg-[#0f0f0f] border border-white/10 rounded-xl p-6 md:p-8 transition-opacity duration-300 ${activeStep < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${activeStep > 2 ? 'bg-gold text-black' : 'bg-white/10 text-gray-400'}`}>
                {activeStep > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <h2 className="text-xl font-serif text-white tracking-wide">Opciones de Entrega</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'own_delivery' }))}
                className={`p-6 border rounded-lg text-left transition-all ${formData.deliveryMethod === 'own_delivery' ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className={`font-bold mb-1 ${formData.deliveryMethod === 'own_delivery' ? 'text-gold' : 'text-white'}`}>Envío Propio (Tienda)</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Envíos dentro de Santiago</p>
              </button>
              
              <button 
                onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'store_pickup' }))}
                className={`p-6 border rounded-lg text-left transition-all ${formData.deliveryMethod === 'store_pickup' ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className={`font-bold mb-1 ${formData.deliveryMethod === 'store_pickup' ? 'text-gold' : 'text-white'}`}>Retiro en Tienda</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Av Antonio Varas 303</p>
              </button>
            </div>
            
            {activeStep === 2 && (
              <div className="flex justify-end pt-8">
                <button onClick={() => setActiveStep(3)} className="bg-[#333333] hover:bg-gold hover:text-black text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Continuar
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Medio de Pago */}
          <div className={`bg-[#0f0f0f] border border-white/10 rounded-xl p-6 md:p-8 transition-opacity duration-300 ${activeStep < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h2 className="text-xl font-serif text-white tracking-wide">Medio de Pago</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'mercadopago' }))}
                className={`p-6 border rounded-lg text-left transition-all ${formData.paymentMethod === 'mercadopago' ? 'border-[#009EE3] bg-[#009EE3]/5' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className={`font-bold mb-1 ${formData.paymentMethod === 'mercadopago' ? 'text-[#009EE3]' : 'text-white'}`}>Mercado Pago</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tarjetas de Débito / Crédito</p>
              </button>
              
              <button 
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'transfer' }))}
                className={`p-6 border rounded-lg text-left transition-all ${formData.paymentMethod === 'transfer' ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className={`font-bold mb-1 ${formData.paymentMethod === 'transfer' ? 'text-gold' : 'text-white'}`}>Transferencia Banca</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Validación manual vía WhatsApp</p>
              </button>
            </div>

            {activeStep === 3 && (
              <button 
                onClick={onComplete}
                className="w-full bg-gold text-black py-4 rounded-md font-bold uppercase tracking-[0.2em] text-xs hover:bg-gold-hover shadow-2xl shadow-gold/20 transition-all"
              >
                Completar Pedido
              </button>
            )}
          </div>

        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 md:p-8 sticky top-6">
            <h2 className="text-xl font-serif text-white tracking-wide italic mb-8">Tu Pedido</h2>
            
            <div className="space-y-4 mb-8">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-400">{item.quantity}x</span>
                    <span className="text-white">{item.name}</span>
                  </div>
                  <span className="text-gray-400 font-bold">${formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-6 mb-6">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 block mb-3">Giftcard o Cupón de Descuento</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej. VERANO20 o GC-XXXX" 
                  className="flex-1 bg-[#161616] border border-white/10 px-4 py-3 rounded-md text-white text-sm focus:border-gold outline-none"
                />
                <button className="bg-[#333333] text-white px-6 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-gold hover:text-black transition-colors">
                  Aplicar
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Neto (Sin IVA)</span>
                <span>${formatPrice(neto)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>IVA (19%)</span>
                <span>${formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-sm font-bold uppercase tracking-widest text-white">Total</span>
                <span className="text-3xl font-serif text-white font-bold">${formatPrice(total)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </>
  );
}
