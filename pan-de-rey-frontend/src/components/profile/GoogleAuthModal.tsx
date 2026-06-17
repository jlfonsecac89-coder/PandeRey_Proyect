'use client';

import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; firstName: string; lastName: string; phone?: string }) => void;
}

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const [step, setStep] = useState<'select' | 'custom' | 'loading'>('select');
  const [loadingUser, setLoadingUser] = useState<string>('');
  
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const mockAccounts = [
    { name: 'Carlos Ortiz', email: 'carlos.ortiz.google@gmail.com', firstName: 'Carlos', lastName: 'Ortiz', phone: '+56 9 8273 6451', color: 'bg-emerald-600' },
    { name: 'Sofía Andrade', email: 'sofia.andrade@gmail.com', firstName: 'Sofía', lastName: 'Andrade', phone: '+56 9 9382 1273', color: 'bg-indigo-600' },
    { name: 'Tomás Valenzuela', email: 'tomas.valenzuela.google@gmail.com', firstName: 'Tomás', lastName: 'Valenzuela', phone: '+56 9 7492 8402', color: 'bg-orange-600' }
  ];

  const handleSelectAccount = (account: typeof mockAccounts[0]) => {
    setLoadingUser(account.name);
    setStep('loading');
    
    setTimeout(() => {
      onSuccess({
        name: account.name,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone
      });
      onClose();
      setStep('select');
    }, 1500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customEmail) return;

    setLoadingUser(customName);
    setStep('loading');

    const nameParts = customName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'Google';

    setTimeout(() => {
      onSuccess({
        name: customName,
        email: customEmail,
        firstName,
        lastName,
        phone: '+56 9 5555 5555'
      });
      onClose();
      setStep('select');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Google Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/5 mb-6">
          <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <h2 className="text-lg font-bold text-white">Acceder con Google</h2>
          <p className="text-xs text-gray-500 mt-1">para continuar en Pan de Rey</p>
        </div>

        {/* Step: SELECT ACCOUNT */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 font-medium px-1">Selecciona una cuenta de Google guardada:</p>
            
            <div className="space-y-2">
              {mockAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleSelectAccount(account)}
                  className="w-full bg-white/[0.02] border border-white/5 hover:border-gold/30 hover:bg-white/[0.04] p-3 rounded-xl flex items-center gap-3 text-left transition-all group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${account.color}`}>
                    {account.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-gold transition-colors">{account.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{account.email}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep('custom')}
              className="w-full border border-white/10 hover:bg-white/5 text-gray-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center cursor-pointer transition-colors mt-2"
            >
              Usar otra cuenta
            </button>

            <div className="flex justify-center pt-4 border-t border-white/5 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] uppercase font-bold tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Step: CUSTOM ACCOUNT */}
        {step === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white uppercase tracking-wider font-bold mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a cuentas
            </button>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Silva"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded-xl text-xs text-white focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Correo Electrónico de Google</label>
                <input
                  type="email"
                  required
                  placeholder="Ej: laura.silva@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded-xl text-xs text-white focus:border-gold outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gold hover:bg-gold-hover text-black py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center cursor-pointer transition-all mt-4"
            >
              Iniciar sesión con esta cuenta
            </button>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] uppercase font-bold tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Step: LOADING CONNECTION */}
        {step === 'loading' && (
          <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
              <div className="absolute inset-0 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Conexión Segura con Google</h4>
              <p className="text-[10px] text-gray-500">
                Iniciando sesión como <strong className="text-gray-300 font-semibold">{loadingUser}</strong>...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
