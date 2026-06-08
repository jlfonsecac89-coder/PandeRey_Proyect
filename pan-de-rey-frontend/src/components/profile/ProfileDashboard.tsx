'use client';

import { useState } from 'react';
import { User, Package, MapPin, LogOut } from 'lucide-react';
import PersonalInfoTab from './tabs/PersonalInfoTab';
import OrdersTab from './tabs/OrdersTab';
import AddressesTab from './tabs/AddressesTab';

type TabType = 'profile' | 'orders' | 'addresses';

export default function ProfileDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="max-w-7xl mx-auto pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 lg:sticky lg:top-32">
            
            {/* Loyalty Club Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1C1A14] to-[#0A0A0A] border border-gold/20 rounded-2xl p-5 mb-8 shadow-xl">
              {/* Subtle shining effect background */}
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-gold/10 rounded-full blur-xl" />
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-gold font-bold">Pan de Rey Club</p>
                  <h2 className="font-serif text-xl text-white italic mt-1">Jose L. Fonseca</h2>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-[8px] font-black uppercase tracking-wider text-gold">
                  Oro
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Puntos Acumulados</p>
                <p className="text-3xl font-serif font-black text-white">2.450 <span className="text-xs text-gold font-sans font-bold tracking-widest uppercase">PTS</span></p>
              </div>
              
              {/* Progress to next tier */}
              <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                <div className="flex justify-between text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                  <span>Próximo Nivel: Platino</span>
                  <span>81%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: '81%' }} />
                </div>
                <p className="text-[8px] text-gray-500 text-right">Faltan 550 pts para ascender</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-2 mb-8">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-[#222222] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-white' : 'text-gray-500'}`} />
                  Mi Perfil
                </div>
                <span className="text-gray-600">&rsaquo;</span>
              </button>

              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-[#222222] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <Package className={`w-4 h-4 ${activeTab === 'orders' ? 'text-white' : 'text-gray-500'}`} />
                  Mis Pedidos
                </div>
                <span className="text-gray-600">&rsaquo;</span>
              </button>

              <button 
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'addresses' ? 'bg-[#222222] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${activeTab === 'addresses' ? 'text-white' : 'text-gray-500'}`} />
                  Direcciones
                </div>
                <span className="text-gray-600">&rsaquo;</span>
              </button>
            </nav>

            <div className="pt-6 border-t border-white/5">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-500/10 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-10 min-h-[500px]">
          {activeTab === 'profile' && <PersonalInfoTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'addresses' && <AddressesTab />}
        </div>

      </div>
    </div>
  );
}
