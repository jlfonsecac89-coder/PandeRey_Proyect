"use client";

import { useState, useEffect } from "react";
import { 
  Palette, 
  Save, 
  LayoutTemplate, 
  Info, 
  Image as ImageIcon, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Monitor, 
  Smartphone, 
  RotateCcw,
  CheckCircle,
  FileText
} from "lucide-react";

// Inline social icons to prevent Lucide React version mismatch errors
const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);
import { getLocalAppearance, saveLocalAppearance, defaultAppearance, type SimAppearance } from "@/utils/dbSim";

// Storefront components for preview
import HeroBanner from "@/components/HeroBanner";
import Storytelling from "@/components/Storytelling";
import CategoryGrid from "@/components/CategoryGrid";
import InstagramGallery from "@/components/InstagramGallery";
import ContactSection from "@/components/ContactSection";

const IMAGE_PRESETS = [
  { label: "Masa Madre Rústica", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Masa Fermentando", url: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Baguette Fresca", url: "https://images.unsplash.com/photo-1598373182133-52452f7691ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Croissant Crujiente", url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Tarta de Merengue", url: "https://images.unsplash.com/photo-1550617931-e17a7b70dce2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Amasando Pan", url: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Café Latte Art", url: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { label: "Harina en la Mesa", url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }
];

export default function AppearanceCMSPage() {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<SimAppearance | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [openSection, setOpenSection] = useState<"hero" | "story" | "instagram" | "contact" | "socials">("hero");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  
  // Custom Preset dropdown states
  const [activePresetPicker, setActivePresetPicker] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setDraft(getLocalAppearance());
  }, []);

  if (!mounted || !draft) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <div className="text-white tracking-widest text-sm uppercase animate-pulse">Cargando Configuración...</div>
      </div>
    );
  }

  const handleFieldChange = (field: keyof SimAppearance, value: any) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleUpdateSlide = (index: number, field: string, value: string) => {
    const newSlides = draft.slides.map((slide, idx) => {
      if (idx === index) {
        return { ...slide, [field]: value };
      }
      return slide;
    });
    setDraft(prev => prev ? { ...prev, slides: newSlides } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleAddSlide = () => {
    const newSlide = {
      image: IMAGE_PRESETS[0].url,
      tagline: "Nueva Diapositiva",
      title1: "Título Principal",
      title2: "Detalle Destacado",
      description: "Descripción breve del nuevo banner promocional de tu panadería artesanal.",
      ctaText: "Ver Tienda",
      ctaLink: "/shop"
    };
    setDraft(prev => prev ? { ...prev, slides: [...prev.slides, newSlide] } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleDeleteSlide = (index: number) => {
    if (draft.slides.length <= 1) return;
    const newSlides = draft.slides.filter((_, idx) => idx !== index);
    setDraft(prev => prev ? { ...prev, slides: newSlides } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleUpdateInstagramPhoto = (index: number, value: string) => {
    const newPhotos = [...draft.instagramPhotos];
    newPhotos[index] = value;
    setDraft(prev => prev ? { ...prev, instagramPhotos: newPhotos } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      saveLocalAppearance(draft);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 800);
  };

  const handleDiscard = () => {
    if (confirm("¿Estás seguro de que deseas descartar los cambios no guardados?")) {
      setDraft(getLocalAppearance());
      setSaveStatus("idle");
    }
  };

  const handleRestoreDefault = () => {
    if (confirm("¿Estás seguro de que deseas restablecer los contenidos a la configuración predeterminada de Pan de Rey? Esto sobrescribirá tus cambios actuales.")) {
      setDraft(defaultAppearance);
      setSaveStatus("idle");
    }
  };

  const toggleSection = (section: typeof openSection) => {
    setOpenSection(prev => prev === section ? "hero" : section);
  };

  // Preset Selector Helper Component
  const PresetPicker = ({ id, onSelect }: { id: string, onSelect: (url: string) => void }) => {
    const isOpen = activePresetPicker === id;
    return (
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setActivePresetPicker(isOpen ? null : id)}
          className="w-full flex items-center justify-between bg-[#0f0f0f] hover:bg-[#181818] border border-white/10 px-4 py-2.5 rounded text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <span>🖼️ Elegir desde presets recomendados</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        
        {isOpen && (
          <div className="absolute z-[90] left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl p-2 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
            {IMAGE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelect(preset.url);
                  setActivePresetPicker(null);
                }}
                className="flex flex-col items-center p-1 border border-white/5 hover:border-gold rounded bg-black/40 hover:bg-black/80 transition-all text-left cursor-pointer"
              >
                <img src={preset.url} alt={preset.label} className="w-full h-12 object-cover rounded-sm mb-1" />
                <span className="text-[9px] text-gray-400 truncate w-full text-center">{preset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="xl:h-[calc(100vh-100px)] flex flex-col xl:flex-row gap-6 -mt-2">
      
      {/* LEFT COLUMN: Controls Panel */}
      <div className="w-full xl:w-[45%] flex flex-col h-full bg-[#161616] border border-white/5 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header bar */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-gold animate-pulse" />
            <div>
              <h1 className="text-base font-serif text-white tracking-wide">Apariencia Web</h1>
              <p className="text-[10px] text-gray-500">Administra el diseño de la Landing Page</p>
            </div>
          </div>
          <button 
            onClick={handleRestoreDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider rounded border border-red-500/20 transition-all cursor-pointer"
            title="Restablecer a la apariencia original de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        </div>

        {/* Scrollable Form Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          
          {/* Section 1: Hero Banner */}
          <div className="border border-white/5 rounded-lg overflow-hidden bg-[#0d0d0d]">
            <button
              onClick={() => toggleSection("hero")}
              className="w-full px-5 py-4 flex items-center justify-between bg-black/30 hover:bg-black/60 text-sm font-semibold tracking-wide text-white transition-all border-b border-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-gold" />
                Banner Principal (Hero)
              </span>
              {openSection === "hero" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            
            {openSection === "hero" && (
              <div className="p-5 space-y-6 animate-in fade-in duration-300">
                {/* Select Type */}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 block">Modo de visualización</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleFieldChange("heroType", "fixed")}
                      className={`py-3 px-4 rounded border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        draft.heroType === "fixed" ? "border-gold bg-gold/5 text-gold" : "border-white/5 hover:border-white/20 bg-black/40 text-gray-400"
                      }`}
                    >
                      <ImageIcon className="w-4.5 h-4.5" />
                      <span className="text-xs font-bold">Imagen Estática</span>
                    </button>
                    <button 
                      onClick={() => handleFieldChange("heroType", "slider")}
                      className={`py-3 px-4 rounded border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        draft.heroType === "slider" ? "border-gold bg-gold/5 text-gold" : "border-white/5 hover:border-white/20 bg-black/40 text-gray-400"
                      }`}
                    >
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-3.5 bg-current opacity-60 rounded-xs"></span>
                        <span className="w-2.5 h-4 bg-current rounded-xs"></span>
                        <span className="w-1.5 h-3.5 bg-current opacity-60 rounded-xs"></span>
                      </div>
                      <span className="text-xs font-bold">Carrusel Animado</span>
                    </button>
                  </div>
                </div>

                {/* If Fixed Image */}
                {draft.heroType === "fixed" ? (
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gold mb-2">Contenido de la Imagen Fija</h3>
                    
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Pre-Título Superior</label>
                      <input 
                        type="text" 
                        value={draft.heroPreTitle}
                        onChange={(e) => handleFieldChange("heroPreTitle", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none transition-colors"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Título Primera Parte</label>
                        <input 
                          type="text" 
                          value={draft.heroTitle1}
                          onChange={(e) => handleFieldChange("heroTitle1", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Título Segunda Parte (Itálica)</label>
                        <input 
                          type="text" 
                          value={draft.heroTitle2}
                          onChange={(e) => handleFieldChange("heroTitle2", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Descripción</label>
                      <textarea 
                        rows={2}
                        value={draft.heroDescription}
                        onChange={(e) => handleFieldChange("heroDescription", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Texto Botón Principal</label>
                        <input 
                          type="text" 
                          value={draft.heroCtaText}
                          onChange={(e) => handleFieldChange("heroCtaText", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Enlace Botón Principal</label>
                        <input 
                          type="text" 
                          value={draft.heroCtaLink}
                          onChange={(e) => handleFieldChange("heroCtaLink", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Texto Botón Secundario</label>
                        <input 
                          type="text" 
                          value={draft.heroSecText}
                          onChange={(e) => handleFieldChange("heroSecText", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Enlace Botón Secundario</label>
                        <input 
                          type="text" 
                          value={draft.heroSecLink}
                          onChange={(e) => handleFieldChange("heroSecLink", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Imagen de Fondo (URL)</label>
                      <input 
                        type="text" 
                        value={draft.heroImage}
                        onChange={(e) => handleFieldChange("heroImage", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none transition-colors"
                      />
                      <PresetPicker id="fixed-hero" onSelect={(url) => handleFieldChange("heroImage", url)} />
                    </div>
                  </div>
                ) : (
                  // If Slider Carousel
                  <div className="space-y-6 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gold">Diapositivas del Carrusel</h3>
                      <button
                        onClick={handleAddSlide}
                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-gold hover:text-gold-hover px-2 py-1 bg-gold/10 hover:bg-gold/20 rounded transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Slide
                      </button>
                    </div>

                    <div className="space-y-4">
                      {draft.slides.map((slide, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-3 relative">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-xs font-bold text-gray-400">Slide #{idx + 1}</span>
                            {draft.slides.length > 1 && (
                              <button
                                onClick={() => handleDeleteSlide(idx)}
                                className="text-red-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                title="Eliminar diapositiva"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Etiqueta Pequeña</label>
                              <input 
                                type="text" 
                                value={slide.tagline}
                                onChange={(e) => handleUpdateSlide(idx, "tagline", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Imagen (URL)</label>
                              <input 
                                type="text" 
                                value={slide.image}
                                onChange={(e) => handleUpdateSlide(idx, "image", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                          </div>
                          
                          <PresetPicker id={`slide-${idx}`} onSelect={(url) => handleUpdateSlide(idx, "image", url)} />

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Título Fijo</label>
                              <input 
                                type="text" 
                                value={slide.title1}
                                onChange={(e) => handleUpdateSlide(idx, "title1", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Título Destacado (Oro)</label>
                              <input 
                                type="text" 
                                value={slide.title2}
                                onChange={(e) => handleUpdateSlide(idx, "title2", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] text-gray-500 uppercase block mb-1">Descripción</label>
                            <textarea 
                              rows={2}
                              value={slide.description}
                              onChange={(e) => handleUpdateSlide(idx, "description", e.target.value)}
                              className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Texto del Botón</label>
                              <input 
                                type="text" 
                                value={slide.ctaText}
                                onChange={(e) => handleUpdateSlide(idx, "ctaText", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-500 uppercase block mb-1">Enlace del Botón</label>
                              <input 
                                type="text" 
                                value={slide.ctaLink}
                                onChange={(e) => handleUpdateSlide(idx, "ctaLink", e.target.value)}
                                className="w-full bg-[#0f0f0f] border border-white/10 p-2 rounded text-[11px] text-white focus:border-gold outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Storytelling */}
          <div className="border border-white/5 rounded-lg overflow-hidden bg-[#0d0d0d]">
            <button
              onClick={() => toggleSection("story")}
              className="w-full px-5 py-4 flex items-center justify-between bg-black/30 hover:bg-black/60 text-sm font-semibold tracking-wide text-white transition-all border-b border-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" />
                Sección Historia (Nosotros)
              </span>
              {openSection === "story" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSection === "story" && (
              <div className="p-5 space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Pre-Título Secundario</label>
                  <input 
                    type="text" 
                    value={draft.historyPreTitle}
                    onChange={(e) => handleFieldChange("historyPreTitle", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Título Fijo</label>
                    <input 
                      type="text" 
                      value={draft.historyTitle1}
                      onChange={(e) => handleFieldChange("historyTitle1", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Título Cursiva Oro</label>
                    <input 
                      type="text" 
                      value={draft.historyTitle2}
                      onChange={(e) => handleFieldChange("historyTitle2", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Párrafo Introductorio (1)</label>
                  <textarea 
                    rows={2}
                    value={draft.historyText1}
                    onChange={(e) => handleFieldChange("historyText1", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Párrafo Metodología (2)</label>
                  <textarea 
                    rows={2}
                    value={draft.historyText2}
                    onChange={(e) => handleFieldChange("historyText2", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Párrafo Conclusión (3)</label>
                  <textarea 
                    rows={2}
                    value={draft.historyText3}
                    onChange={(e) => handleFieldChange("historyText3", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Imagen Lateral (URL)</label>
                  <input 
                    type="text" 
                    value={draft.historyImage}
                    onChange={(e) => handleFieldChange("historyImage", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                  />
                  <PresetPicker id="story-image" onSelect={(url) => handleFieldChange("historyImage", url)} />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Insignia 1: Valor</label>
                    <input 
                      type="text" 
                      value={draft.historyBadge1Value}
                      onChange={(e) => handleFieldChange("historyBadge1Value", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gold font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Insignia 1: Etiqueta</label>
                    <input 
                      type="text" 
                      value={draft.historyBadge1Label}
                      onChange={(e) => handleFieldChange("historyBadge1Label", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Insignia 2: Valor</label>
                    <input 
                      type="text" 
                      value={draft.historyBadge2Value}
                      onChange={(e) => handleFieldChange("historyBadge2Value", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gold font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Insignia 2: Etiqueta</label>
                    <input 
                      type="text" 
                      value={draft.historyBadge2Label}
                      onChange={(e) => handleFieldChange("historyBadge2Label", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Instagram Gallery */}
          <div className="border border-white/5 rounded-lg overflow-hidden bg-[#0d0d0d]">
            <button
              onClick={() => toggleSection("instagram")}
              className="w-full px-5 py-4 flex items-center justify-between bg-black/30 hover:bg-black/60 text-sm font-semibold tracking-wide text-white transition-all border-b border-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-gold" />
                Galería de Instagram (6 fotos)
              </span>
              {openSection === "instagram" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSection === "instagram" && (
              <div className="p-5 space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Tagline Galería</label>
                  <input 
                    type="text" 
                    value={draft.instagramTagline}
                    onChange={(e) => handleFieldChange("instagramTagline", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Usuario de Instagram</label>
                  <input 
                    type="text" 
                    value={draft.instagramAccount}
                    onChange={(e) => handleFieldChange("instagramAccount", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gold font-bold"
                  />
                </div>

                <div className="border-t border-white/5 pt-3 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fotos de la Galería</h4>
                  {draft.instagramPhotos.map((photo, idx) => (
                    <div key={idx} className="space-y-1.5 p-3 bg-white/[0.01] border border-white/5 rounded">
                      <label className="text-[9.5px] text-gold font-semibold uppercase block">Imagen #{idx + 1}</label>
                      <input 
                        type="text" 
                        value={photo}
                        onChange={(e) => handleUpdateInstagramPhoto(idx, e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-gray-300 focus:text-white"
                      />
                      <PresetPicker id={`insta-photo-${idx}`} onSelect={(url) => handleUpdateInstagramPhoto(idx, url)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Contact Info */}
          <div className="border border-white/5 rounded-lg overflow-hidden bg-[#0d0d0d]">
            <button
              onClick={() => toggleSection("contact")}
              className="w-full px-5 py-4 flex items-center justify-between bg-black/30 hover:bg-black/60 text-sm font-semibold tracking-wide text-white transition-all border-b border-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold" />
                Información de Contacto
              </span>
              {openSection === "contact" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSection === "contact" && (
              <div className="p-5 space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Título de Sección de Contacto</label>
                  <input 
                    type="text" 
                    value={draft.contactTitle}
                    onChange={(e) => handleFieldChange("contactTitle", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Dirección Física</label>
                  <input 
                    type="text" 
                    value={draft.contactAddress}
                    onChange={(e) => handleFieldChange("contactAddress", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Horario Semana</label>
                    <input 
                      type="text" 
                      value={draft.contactScheduleWeekdays}
                      onChange={(e) => handleFieldChange("contactScheduleWeekdays", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Horario Fin de Semana</label>
                    <input 
                      type="text" 
                      value={draft.contactScheduleWeekends}
                      onChange={(e) => handleFieldChange("contactScheduleWeekends", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={draft.contactEmail}
                      onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={draft.contactPhone}
                      onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Social Networks */}
          <div className="border border-white/5 rounded-lg overflow-hidden bg-[#0d0d0d]">
            <button
              onClick={() => toggleSection("socials")}
              className="w-full px-5 py-4 flex items-center justify-between bg-black/30 hover:bg-black/60 text-sm font-semibold tracking-wide text-white transition-all border-b border-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-gold" />
                Redes Sociales (Enlaces)
              </span>
              {openSection === "socials" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSection === "socials" && (
              <div className="p-5 space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1 flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5 text-blue-500" /> Facebook Link</label>
                  <input 
                    type="text" 
                    value={draft.facebookUrl}
                    onChange={(e) => handleFieldChange("facebookUrl", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gray-300"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1 flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram Link</label>
                  <input 
                    type="text" 
                    value={draft.instagramUrl}
                    onChange={(e) => handleFieldChange("instagramUrl", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gray-300"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1 flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5 text-blue-400" /> Twitter / X Link</label>
                  <input 
                    type="text" 
                    value={draft.twitterUrl}
                    onChange={(e) => handleFieldChange("twitterUrl", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-gray-300"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions Panel */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={handleDiscard}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            Descartar
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-6 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/10 hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {saveStatus === "saving" ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <CheckCircle className="w-4 h-4 text-black" />
                ¡Guardado!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar y Publicar
              </>
            )}
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN: Live Responsive Preview Panel */}
      <div className="w-full xl:w-[55%] flex flex-col h-full bg-[#0d0d0d] border border-white/5 rounded-xl shadow-2xl p-4 overflow-hidden">
        
        {/* Toggle view size bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Vista Previa en Vivo</span>
          
          <div className="flex gap-2 bg-[#161616] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                previewMode === "desktop" ? "bg-gold text-black shadow-md font-semibold" : "text-gray-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                previewMode === "mobile" ? "bg-gold text-black shadow-md font-semibold" : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Celular
            </button>
          </div>
        </div>

        {/* Mock Browser/Storeframe Container */}
        <div className="flex-1 bg-black/40 rounded-lg p-4 flex items-center justify-center overflow-hidden border border-white/5 relative">
          
          {/* Simulated view wrapper */}
          <div 
            className={`transition-all duration-300 h-full flex flex-col ${
              previewMode === "mobile" 
                ? "w-[360px] max-h-[700px] border-[12px] border-[#222] rounded-[40px] shadow-2xl relative overflow-hidden bg-background" 
                : "w-full border border-white/10 rounded-lg shadow-xl relative overflow-hidden bg-background"
            }`}
          >
            {/* Simulated Address Bar for Premium Feeling */}
            <div className="bg-[#1c1c1c] border-b border-[#2d2d2d] px-4 py-2 flex items-center gap-3 shrink-0 select-none">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              </div>
              <div className="flex-1 bg-black/45 rounded py-0.5 text-center text-[10px] text-gray-500 truncate font-mono">
                https://panderey.cl/
              </div>
            </div>

            {/* Main store preview frame body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth text-foreground">
              
              {/* Dynamic Navbar Mock */}
              <div className="bg-background/95 border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <span className="font-serif text-lg text-white font-bold tracking-widest">PAN DE REY</span>
                <div className="flex gap-4 text-[10px] uppercase font-bold text-gray-400">
                  <span className="text-gold">Inicio</span>
                  <span>Productos</span>
                  <span>Contacto</span>
                </div>
              </div>

              {/* Render dynamic sections using draft state */}
              <HeroBanner previewData={draft} />
              
              <Storytelling previewData={draft} />
              
              {/* Category Grid is rendered just to show full layout */}
              <CategoryGrid />
              
              <InstagramGallery previewData={draft} />
              
              <ContactSection previewData={draft} />

              {/* Dynamic Footer Mock */}
              <footer className="bg-charcoal-light py-8 border-t border-charcoal-border text-center text-xs text-gray-400">
                <p className="font-serif text-lg text-gold mb-1 tracking-wider">PAN DE REY</p>
                <p className="text-[9px] tracking-widest uppercase text-gray-600 mb-3">Artesanal & Premium</p>
                
                <div className="flex flex-col gap-1.5 justify-center items-center mb-4 text-[10px] text-gray-500">
                  <span>{draft.contactPhone}</span>
                  <span>{draft.contactEmail}</span>
                  <div className="flex gap-3 mt-1.5">
                    {draft.facebookUrl && <span className="hover:text-gold">Facebook</span>}
                    {draft.instagramUrl && <span className="hover:text-gold">Instagram</span>}
                    {draft.twitterUrl && <span className="hover:text-gold">Twitter</span>}
                  </div>
                </div>
                
                <p className="text-[9px] text-gray-600">© {new Date().getFullYear()} Pan de Rey. Todos los derechos reservados.</p>
              </footer>

            </div>
            
          </div>
        </div>

      </div>

    </div>
  );
}
