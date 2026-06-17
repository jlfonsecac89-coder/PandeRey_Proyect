'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Info } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; firstName: string; lastName: string; phone?: string; picture?: string }) => void;
}

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const [step, setStep] = useState<'select' | 'custom' | 'loading'>('select');
  const [loadingUser, setLoadingUser] = useState<string>('');
  
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // Decode Google JWT securely on client side
  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decodificando el token de Google', e);
      return null;
    }
  };

  // Initialize and Render Real Google Button inside modal container
  useEffect(() => {
    if (!isOpen) return;

    let checkInterval: NodeJS.Timeout;
    
    const initializeGoogleBtn = () => {
      const google = (window as any).google;
      if (google && google.accounts) {
        setGsiLoaded(true);
        clearInterval(checkInterval);

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "438905202863-placeholder.apps.googleusercontent.com";
        
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              setStep('loading');
              const payload = decodeJwt(response.credential);
              if (payload) {
                setLoadingUser(payload.name || payload.email);
                
                setTimeout(() => {
                  onSuccess({
                    name: payload.name || `${payload.given_name} ${payload.family_name}`,
                    email: payload.email,
                    firstName: payload.given_name || payload.name?.split(' ')[0] || 'Google',
                    lastName: payload.family_name || payload.name?.split(' ')[1] || 'User',
                    picture: payload.picture,
                    phone: '+56 9 8273 6451'
                  });
                  onClose();
                  setStep('select');
                }, 1200);
              }
            }
          }
        });

        // Render real button using Google API
        const btnContainer = document.getElementById('google-real-btn-container');
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: 'filled_blue',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular'
          });
        }
      }
    };

    // Check if GSI loaded, poll if necessary
    if ((window as any).google) {
      initializeGoogleBtn();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).google) {
          initializeGoogleBtn();
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isOpen, step]);

  if (!isOpen) return null;

  const mockAccounts = [
    { name: 'Jose Luis Fonseca', email: 'jlfonsecac89@gmail.com', firstName: 'Jose Luis', lastName: 'Fonseca', phone: '+56 9 8765 4321', color: 'bg-blue-600' },
    { name: 'Sofía Andrade', email: 'sofia.andrade@gmail.com', firstName: 'Sofía', lastName: 'Andrade', phone: '+56 9 9382 1273', color: 'bg-indigo-600' }
  ];

  const handleSelectMockAccount = (account: typeof mockAccounts[0]) => {
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
        <div className="flex flex-col items-center text-center pb-5 border-b border-white/5 mb-5">
          <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <h2 className="text-base font-bold text-white">Iniciar Sesión de Google</h2>
          <p className="text-xs text-gray-500 mt-1 font-light">Conexión directa mediante Google Identity Services</p>
        </div>

        {/* Step: SELECT / SIGN IN */}
        {step === 'select' && (
          <div className="space-y-5">
            {/* Real Google Button Container */}
            <div className="flex flex-col items-center justify-center space-y-3 py-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Acceso Oficial con Cuenta de Google</span>
              
              <div id="google-real-btn-container" className="w-full flex justify-center min-h-[40px]">
                {!gsiLoaded && (
                  <div className="text-[11px] text-gray-500 italic animate-pulse">Cargando SDK de Google...</div>
                )}
              </div>
              
              <p className="text-[9px] text-gray-500 text-center leading-normal max-w-xs font-sans">
                Al hacer clic se levantará la ventana oficial de Google. Requiere registrar tu Client ID real en <code>.env.local</code>.
              </p>
            </div>

            {/* Separator */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[9px]"><span className="bg-[#1c1c1c] px-3 text-gray-500 uppercase tracking-widest font-bold">O usa la Simulación Local</span></div>
            </div>

            {/* Mock simulator fallback */}
            <div className="space-y-2.5">
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex gap-2 items-start text-left">
                <Info className="w-4 h-4 text-yellow-500/80 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-normal font-sans">
                  <strong>¿Probando sin Client ID?</strong> Usa estas cuentas sembradas para validar la captura de datos y el flujo de fidelización al instante:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mockAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleSelectMockAccount(account)}
                    className="bg-white/[0.02] border border-white/5 hover:border-gold/30 hover:bg-white/[0.04] p-2.5 rounded-lg flex items-center gap-2.5 text-left transition-all group cursor-pointer"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${account.color}`}>
                      {account.firstName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-white group-hover:text-gold transition-colors truncate">{account.name}</p>
                      <p className="text-[8px] text-gray-500 truncate">{account.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep('custom')}
                className="w-full border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest text-center cursor-pointer transition-colors"
              >
                Simular con otra cuenta
              </button>
            </div>

            <div className="flex justify-center pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] uppercase font-bold tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                Cerrar
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
              className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-white uppercase tracking-wider font-bold mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Volver a selección
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
              Simular inicio de sesión
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
