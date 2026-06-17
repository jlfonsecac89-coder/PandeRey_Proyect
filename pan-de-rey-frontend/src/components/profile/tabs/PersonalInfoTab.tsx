'use client';

import { useState, useEffect } from 'react';
import { Edit2, Star } from 'lucide-react';

export default function PersonalInfoTab() {
  const [customer, setCustomer] = useState({
    name: 'Jose Luis Fonseca',
    email: 'jlfonsecac89@gmail.com',
    phone: 'No registrado',
    rut: 'No registrado',
    points: 2450
  });

  useEffect(() => {
    const saved = localStorage.getItem('pan_de_rey_active_customer');
    if (saved) {
      setCustomer(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
        <h2 className="font-serif text-3xl text-white italic tracking-wide">Información Personal</h2>
        <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gold transition-colors">
          <Edit2 className="w-3 h-3" />
          Editar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
        
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Nombre Completo</p>
          <p className="text-white text-lg font-serif italic">{customer.name}</p>
        </div>

        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Teléfono</p>
          <p className="text-gray-300">{customer.phone}</p>
        </div>

        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Correo Electrónico</p>
          <p className="text-gray-300">{customer.email}</p>
        </div>

        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Preferencia</p>
          <p className="text-gray-300">Retiro En Tienda</p>
        </div>

        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">RUT</p>
          <p className="text-gray-300">{customer.rut}</p>
        </div>

        <div className="col-span-1 md:col-span-2 mt-4">
          <div className="bg-[#161616] border border-white/5 rounded-xl p-6 flex flex-col justify-center max-w-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-gold" /> Puntos Acumulados
            </p>
            <p className="text-4xl font-serif text-white italic font-bold">{customer.points}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

