"use client";

import { useState } from 'react';
import { Palette, Info, Image as ImageIcon, Save, LayoutTemplate } from 'lucide-react';

export default function AppearanceCMSPage() {
  const [heroType, setHeroType] = useState('fixed'); // 'fixed' | 'slider'

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-white tracking-wide flex items-center gap-3">
          <Palette className="w-6 h-6 text-gold" />
          Apariencia Web (CMS)
        </h1>
        <p className="text-sm text-gray-400 mt-2">Gestiona el contenido principal y las imágenes de la tienda pública.</p>
      </div>

      {/* Banner Hero Settings */}
      <div className="bg-[#161616] border border-white/5 rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <LayoutTemplate className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">Banner Principal (Hero)</h2>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Tipo de Banner */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4 block">Tipo de Visualización</label>
            <div className="flex gap-4">
              <button 
                onClick={() => setHeroType('fixed')}
                className={`flex-1 py-4 px-6 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                  heroType === 'fixed' ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/30 bg-[#0f0f0f]'
                }`}
              >
                <ImageIcon className={`w-6 h-6 ${heroType === 'fixed' ? 'text-gold' : 'text-gray-500'}`} />
                <span className={`text-sm font-bold ${heroType === 'fixed' ? 'text-gold' : 'text-gray-300'}`}>Imagen Fija</span>
                <span className="text-[10px] text-gray-500">Ideal para estética minimalista</span>
              </button>

              <button 
                onClick={() => setHeroType('slider')}
                className={`flex-1 py-4 px-6 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                  heroType === 'slider' ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/30 bg-[#0f0f0f]'
                }`}
              >
                <div className="flex gap-1">
                  <span className={`w-2 h-4 rounded-sm ${heroType === 'slider' ? 'bg-gold/50' : 'bg-gray-600'}`}></span>
                  <span className={`w-3 h-5 rounded-sm ${heroType === 'slider' ? 'bg-gold' : 'bg-gray-500'}`}></span>
                  <span className={`w-2 h-4 rounded-sm ${heroType === 'slider' ? 'bg-gold/50' : 'bg-gray-600'}`}></span>
                </div>
                <span className={`text-sm font-bold ${heroType === 'slider' ? 'text-gold' : 'text-gray-300'}`}>Carrusel (Slider)</span>
                <span className="text-[10px] text-gray-500">Para eventos y múltiples promociones</span>
              </button>
            </div>
          </div>

          {/* Advertencia de Tamaños */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-500 mb-1">Dimensiones Recomendadas</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Para garantizar que la web mantenga su calidad premium en cualquier pantalla, las imágenes subidas deben respetar las siguientes dimensiones:
                <br />
                <strong className="text-white mt-1 block">• Si usas Banner Completo (Carrusel):</strong> 1920x1080px (Formato horizontal panorámico).
                <br />
                <strong className="text-white">• Si usas Imagen Fija:</strong> 1200x800px centrada, con espacio seguro para los textos.
              </p>
            </div>
          </div>

          {/* Textos y Contenidos */}
          <div className="space-y-8">
            <h3 className="text-white font-serif text-lg border-b border-white/10 pb-2">Textos del Banner</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Pre-Título (Texto superior dorado)</label>
                <input 
                  type="text" 
                  defaultValue="ARTESANAL & PREMIUM"
                  className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-gold font-bold uppercase text-xs tracking-widest focus:border-gold outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Título Principal</label>
                <input 
                  type="text" 
                  defaultValue="El Arte del Buen Sabor"
                  className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-white font-serif text-lg focus:border-gold outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Descripción Detallada</label>
              <textarea 
                rows={3}
                defaultValue="Descubre nuestra selección exclusiva de panes de masa madre, pastelería fina y especialidades para compartir. Cada pieza es elaborada con dedicación y los mejores ingredientes."
                className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-gray-300 text-sm focus:border-gold outline-none transition-colors resize-none"
              />
            </div>

            <h3 className="text-white font-serif text-lg border-b border-white/10 pb-2 pt-4">Botones y Enlaces</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block flex items-center justify-between">
                  <span>Botón Primario (Dorado)</span>
                  <span className="text-green-500 text-[9px]">Activo</span>
                </label>
                <div className="space-y-3">
                  <input type="text" defaultValue="TIENDA" placeholder="Texto del botón" className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded-md text-white text-xs font-bold uppercase tracking-widest focus:border-gold outline-none" />
                  <input type="text" defaultValue="/shop" placeholder="Enlace (URL) ej: /descuentos" className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded-md text-blue-400 text-xs focus:border-gold outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block flex items-center justify-between">
                  <span>Botón Secundario (Transparente)</span>
                  <span className="text-green-500 text-[9px]">Activo</span>
                </label>
                <div className="space-y-3">
                  <input type="text" defaultValue="NUESTRA HISTORIA" placeholder="Texto del botón" className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded-md text-white text-xs font-bold uppercase tracking-widest focus:border-gold outline-none" />
                  <input type="text" defaultValue="/#storytelling" placeholder="Enlace (URL)" className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded-md text-blue-400 text-xs focus:border-gold outline-none" />
                </div>
              </div>
            </div>

            <h3 className="text-white font-serif text-lg border-b border-white/10 pb-2 pt-4">Multimedia</h3>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">URL de la Imagen Principal del Banner</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  defaultValue="/storefront.jpg"
                  className="flex-1 bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-gray-400 focus:text-white focus:border-gold outline-none transition-colors"
                />
                <button className="bg-[#333] hover:bg-white/20 text-white px-6 py-4 sm:py-0 rounded-md text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                  Subir Foto
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Enlace de la Imagen (Opcional)</label>
              <p className="text-xs text-gray-500 mb-3">Si deseas que al hacer clic en cualquier parte de la imagen el cliente vaya a una URL especial (ej: un evento), colócala aquí:</p>
              <input 
                type="text" 
                placeholder="Ej: /evento-navidad-2026"
                className="w-full bg-[#0f0f0f] border border-white/10 p-4 rounded-md text-blue-400 focus:text-white focus:border-gold outline-none transition-colors"
              />
            </div>
            
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-t border-white/5 flex justify-end gap-4">
          <button className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
            Descartar Cambios
          </button>
          <button className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors">
            <Save className="w-4 h-4" />
            Guardar y Publicar
          </button>
        </div>

      </div>

    </div>
  );
}
