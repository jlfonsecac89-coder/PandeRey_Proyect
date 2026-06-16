'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getLocalAppearance } from '@/utils/dbSim';

export default function Storytelling({ previewData }: { previewData?: any } = {}) {
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (!previewData) {
      setAppearance(getLocalAppearance());
    }
  }, [previewData]);

  if (!mounted) return null;

  const activeAppearance = previewData || appearance;
  const tagline = activeAppearance?.historyPreTitle || 'Nuestra Historia';
  const title1 = activeAppearance?.historyTitle1 || 'Tradición familiar,';
  const title2 = activeAppearance?.historyTitle2 || 'pasión por el detalle';
  const text1 = activeAppearance?.historyText1 || 'En Pan de Rey, creemos que el pan es más que alimento; es un vínculo con nuestras raíces. Cada mañana, nuestro horno cobra vida para transformar ingredientes nobles en piezas únicas de arte comestible.';
  const text2 = activeAppearance?.historyText2 || 'Nuestra masa madre, cultivada con paciencia y cuidado, otorga a cada pan una textura y sabor inigualables, respetando los tiempos naturales de fermentación para una digestión más ligera y nutritiva.';
  const text3 = activeAppearance?.historyText3 || 'Desde el crujiente de nuestras baguettes hasta la delicadeza de nuestra pastelería francesa, cada producto cuenta una historia de dedicación y excelencia.';
  const image = activeAppearance?.historyImage || '/storefront.jpg';
  const badge1Value = activeAppearance?.historyBadge1Value || '100%';
  const badge1Label = activeAppearance?.historyBadge1Label || 'Artesanal';
  const badge2Value = activeAppearance?.historyBadge2Value || '+48h';
  const badge2Label = activeAppearance?.historyBadge2Label || 'Fermentación';

  return (
    <section id="storytelling" className="py-24 bg-charcoal-light relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-[600px] rounded-sm overflow-hidden group">
            <Image 
              src={image}
              alt="Pan de Rey Local"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 border-[12px] border-gold/20 m-6"></div>
          </div>
          
          <div className="space-y-8">
            <span className="text-gold uppercase tracking-[0.3em] text-sm font-semibold">
              {tagline}
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight">
              {title1} <br/>
              <span className="italic text-gold font-light font-serif">{title2}</span>
            </h2>
            <div className="w-20 h-1 bg-gold"></div>
            
            <div className="space-y-6 text-gray-400 text-lg leading-relaxed font-light">
              {text1 && <p>{text1}</p>}
              {text2 && <p>{text2}</p>}
              {text3 && <p>{text3}</p>}
            </div>
            
            <div className="pt-8 grid grid-cols-2 gap-8">
              {(badge1Value || badge1Label) && (
                <div>
                  <span className="block text-3xl font-serif text-gold mb-2">{badge1Value}</span>
                  <span className="text-sm uppercase tracking-widest text-gray-500">{badge1Label}</span>
                </div>
              )}
              {(badge2Value || badge2Label) && (
                <div>
                  <span className="block text-3xl font-serif text-gold mb-2">{badge2Value}</span>
                  <span className="text-sm uppercase tracking-widest text-gray-500">{badge2Label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
    </section>
  );
}
