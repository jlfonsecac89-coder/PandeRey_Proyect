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
            
            {/* User Profile Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-[#161616] border border-white/5 rounded-full flex items-center justify-center text-gold">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-white italic">Jose</h2>
                <p className="text-gold text-xs font-bold tracking-widest uppercase">0 PUNTOS</p>
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
