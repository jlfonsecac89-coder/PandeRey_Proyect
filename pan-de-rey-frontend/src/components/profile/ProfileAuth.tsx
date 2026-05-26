'use client';

import { useState } from 'react';
import { Mail, Lock, User, Calendar, FileText, Smartphone, Check } from 'lucide-react';
import TermsAndConditions from '../shop/TermsAndConditions';

type AuthMode = 'selection' | 'login' | 'register';

export default function ProfileAuth({ onLogin }: { onLogin: () => void }) {
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
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'register' && !formData.acceptTerms) {
      alert('Debes aceptar los Términos y Condiciones para crear tu cuenta.');
      return;
    }
    
    if (authMode === 'login' && (!formData.email || !formData.password)) {
      alert('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    if (authMode === 'register' && (!formData.email || !formData.firstName || !formData.lastName || !formData.password)) {
      alert('Por favor, completa los campos obligatorios marcados con asterisco.');
      return;
    }

    // Si todo está bien, simulamos el inicio de sesión
    onLogin();
  };

  return (
    <>
      <TermsAndConditions isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      
      <div className="max-w-xl mx-auto pt-24 pb-12 px-4">
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-12 text-white italic tracking-wide">
          Mi Cuenta
        </h1>

        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="animate-in fade-in duration-300">
            {authMode === 'selection' && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-6 text-center">Accede a tu perfil para ver tus pedidos y gestionar tus direcciones.</p>
                
                <button onClick={() => setAuthMode('login')} className="w-full bg-[#161616] border border-white/10 hover:border-gold/50 text-white p-4 rounded-md flex justify-between items-center transition-all group">
                  <span className="font-bold tracking-wide flex items-center gap-3"><User className="w-5 h-5 text-gold" /> Iniciar Sesión</span>
                  <span className="text-xs text-gray-500 group-hover:text-gold transition-colors">Tengo una cuenta</span>
                </button>

                <button onClick={() => setAuthMode('register')} className="w-full bg-[#161616] border border-white/10 hover:border-gold/50 text-white p-4 rounded-md flex justify-between items-center transition-all group">
                  <span className="font-bold tracking-wide flex items-center gap-3"><Mail className="w-5 h-5 text-gold" /> Crear Cuenta</span>
                  <span className="text-xs text-gray-500 group-hover:text-gold transition-colors">Nuevo cliente</span>
                </button>
              </div>
            )}

            {authMode === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
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

            {authMode === 'register' && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
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
                        const year = new Date().getFullYear() - i - 18;
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
                    Crear Cuenta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
