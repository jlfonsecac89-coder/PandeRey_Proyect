'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function AddressesTab() {
  const [showForm, setShowForm] = useState(true); // By default true as per screenshot

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
        <h2 className="font-serif text-3xl text-white italic tracking-wide">Mis Direcciones</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black bg-gold hover:bg-gold-hover px-4 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Nueva
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">
                  Nombre de la dirección (Ej: Casa, Oficina)
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Mi Departamento"
                  className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 md:pb-4">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" id="isMain" />
                  <div className="w-5 h-5 rounded border border-white/30 bg-[#0f0f0f] peer-checked:bg-gold peer-checked:border-gold transition-colors flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <label htmlFor="isMain" className="text-xs font-bold text-gray-300 uppercase tracking-widest cursor-pointer select-none">
                  Establecer como principal
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input 
                type="text" 
                placeholder="Calle"
                className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none transition-colors"
              />
              <input 
                type="text" 
                placeholder="Número"
                className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <select className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none appearance-none transition-colors">
                <option value="">Región</option>
                <option value="rm">Región Metropolitana</option>
              </select>
              <select className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none appearance-none transition-colors">
                <option value="">Provincia</option>
                <option value="santiago">Santiago</option>
              </select>
              <select className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none appearance-none transition-colors">
                <option value="">Comuna</option>
                <option value="providencia">Providencia</option>
                <option value="nunoa">Ñuñoa</option>
                <option value="lascondes">Las Condes</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <select className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white focus:border-gold outline-none appearance-none transition-colors">
                <option value="casa">Casa</option>
                <option value="depto">Departamento</option>
                <option value="oficina">Oficina</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full sm:w-auto px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest bg-[#333333] text-white hover:bg-gold hover:text-black transition-colors"
              >
                Guardar Dirección
              </button>
            </div>

          </form>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No tienes direcciones guardadas.
        </div>
      )}
    </div>
  );
}
