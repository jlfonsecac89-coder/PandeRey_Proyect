'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalAppearance } from '@/utils/dbSim';

// Fallback slides in case DB has not loaded yet
const fallbackSlides = [
  {
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    tagline: 'Masa Madre & Tradición',
    title1: 'El Arte de la',
    title2: 'Fermentación Lenta',
    description: 'Panes rústicos y piezas de autor horneados diariamente con fermentación natural de 48 horas y harinas orgánicas.',
    ctaText: 'Ver Panadería',
    ctaLink: '/shop?category=bakery'
  },
  {
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    tagline: 'Haute Pâtisserie',
    title1: 'Alta Pastelería',
    title2: 'Fina y Delicada',
    description: 'Viennoiserie clásica, croissants de pura mantequilla de Normandía y postres de autor creados por nuestros maestros pasteleros.',
    ctaText: 'Explorar Dulces',
    ctaLink: '/shop?category=pastry'
  },
  {
    image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    tagline: 'Cafetería de Especialidad',
    title1: 'Granos de Origen',
    title2: 'Tostado Perfecto',
    description: 'Cafés seleccionados de fincas sostenibles de Colombia y Etiopía, extraídos con maestría para acompañar tu día.',
    ctaText: 'Ver Cafetería',
    ctaLink: '/shop?category=drinks'
  }
];

export default function HeroBanner({ previewData }: { previewData?: any } = {}) {
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (!previewData) {
      setAppearance(getLocalAppearance());
    }
  }, [previewData]);

  const activeAppearance = previewData || appearance;
  const heroType = activeAppearance?.heroType || 'slider';
  const slides = activeAppearance?.slides?.length ? activeAppearance.slides : fallbackSlides;

  useEffect(() => {
    if (!mounted || heroType === 'fixed') return;

    const interval = 30; // ms
    const duration = 6000; // 6s
    const increment = (interval / duration) * 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(progressTimer);
  }, [currentSlide, heroType, slides.length, mounted]);

  if (!mounted) {
    return (
      <div className="relative h-screen flex items-center justify-center bg-black">
        <div className="text-white text-sm tracking-widest font-mono animate-pulse uppercase">Cargando...</div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const handleSelectSlide = (index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  // Fixed view
  if (heroType === 'fixed') {
    const heroImage = activeAppearance?.heroImage || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
    const tagline = activeAppearance?.heroPreTitle || 'ARTESANAL & PREMIUM';
    const title1 = activeAppearance?.heroTitle1 || 'El Arte del Buen Sabor';
    const title2 = activeAppearance?.heroTitle2 || '';
    const description = activeAppearance?.heroDescription || 'Panes rústicos y pastelería horneados diariamente con fermentación lenta.';
    const ctaText = activeAppearance?.heroCtaText || 'TIENDA';
    const ctaLink = activeAppearance?.heroCtaLink || '/shop';
    const secText = activeAppearance?.heroSecText || 'NUESTRA HISTORIA';
    const secLink = activeAppearance?.heroSecLink || '/#storytelling';

    return (
      <div className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-40 scale-100 transform duration-[1500ms]">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${heroImage}")` }}
          />
        </div>
        
        {/* Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/30 to-background z-1"></div>
        <div className="absolute inset-0 bg-black/45 z-1"></div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <span className="text-gold uppercase tracking-[0.3em] text-[10px] md:text-xs font-semibold mb-6 block">
              {tagline}
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight tracking-wide">
              {title1} {title2 && <br/>}
              {title2 && <span className="text-gold italic font-light font-serif">{title2}</span>}
            </h1>
            <p className="text-foreground/80 text-sm md:text-lg mb-12 max-w-2xl mx-auto font-light leading-relaxed font-sans">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {ctaText && (
                <Link 
                  href={ctaLink} 
                  className="w-full sm:w-auto px-8 py-4 bg-gold text-black font-semibold text-xs tracking-[0.2em] uppercase hover:bg-gold-hover transition-all rounded-sm shadow-xl shadow-gold/5 hover:scale-105 duration-300"
                >
                  {ctaText}
                </Link>
              )}
              {secText && (
                <Link 
                  href={secLink} 
                  className="w-full sm:w-auto px-8 py-4 border border-white/20 text-white font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/5 transition-colors rounded-sm"
                >
                  {secText}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Slider view
  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden bg-black group">
      {/* Background Images */}
      {slides.map((slide: any, idx: number) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentSlide ? 'opacity-40 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          } transform duration-[1500ms]`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${slide.image}")` }}
          />
        </div>
      ))}
      
      {/* Vignette Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/30 to-background z-1"></div>
      <div className="absolute inset-0 bg-black/45 z-1"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20">
        {slides.map((slide: any, idx: number) => {
          if (idx !== currentSlide) return null;
          return (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <span className="text-gold uppercase tracking-[0.3em] text-[10px] md:text-xs font-semibold mb-6 block">
                {slide.tagline}
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight tracking-wide">
                {slide.title1} <br/>
                <span className="text-gold italic font-light font-serif">{slide.title2}</span>
              </h1>
              <p className="text-foreground/80 text-sm md:text-lg mb-12 max-w-2xl mx-auto font-light leading-relaxed font-sans">
                {slide.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  href={slide.ctaLink} 
                  className="w-full sm:w-auto px-8 py-4 bg-gold text-black font-semibold text-xs tracking-[0.2em] uppercase hover:bg-gold-hover transition-all rounded-sm shadow-xl shadow-gold/5 hover:scale-105 duration-300"
                >
                  {slide.ctaText}
                </Link>
                <Link 
                  href="/#storytelling" 
                  className="w-full sm:w-auto px-8 py-4 border border-white/20 text-white font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/5 transition-colors rounded-sm"
                >
                  Nuestra Historia
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-white/10 bg-black/20 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:border-gold/50 hover:text-gold cursor-pointer"
        aria-label="Diapositiva anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-white/10 bg-black/20 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:border-gold/50 hover:text-gold cursor-pointer"
        aria-label="Siguiente diapositiva"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Progress indicators at bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-4 w-full max-w-sm px-6">
        {slides.map((_: any, idx: number) => (
          <button
            key={idx}
            onClick={() => handleSelectSlide(idx)}
            className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden transition-all duration-300 relative cursor-pointer"
          >
            {idx === currentSlide && (
              <div 
                className="h-full bg-gold transition-all ease-linear"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className="sr-only">Slide {idx + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
