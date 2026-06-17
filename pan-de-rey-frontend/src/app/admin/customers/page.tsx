"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Search, 
  Mail, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Zap, 
  RotateCcw,
  Activity,
  ChevronRight,
  Info
} from "lucide-react";
import { getLocalCustomerRFM, type SimCustomerRFM } from "@/utils/dbSim";

export default function CustomerAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<SimCustomerRFM[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<SimCustomerRFM["segment"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "registered" | "leads">("all");
  const [selectedLeadCampaign, setSelectedLeadCampaign] = useState<"registro" | "segunda" | "encuesta">("registro");
  
  // Modal / notification states
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedCustomerForMail, setSelectedCustomerForMail] = useState<SimCustomerRFM | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCustomers(getLocalCustomerRFM());
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <div className="text-white tracking-widest text-sm uppercase animate-pulse">Cargando Análisis de Clientes...</div>
      </div>
    );
  }

  // Format CLP currency
  const formatCLP = (val: number) => `$${Math.round(val).toLocaleString("es-CL")}`;

  // Segments aggregation
  const getSegmentStats = (seg: SimCustomerRFM["segment"]) => {
    const segClients = customers.filter(c => c.segment === seg);
    const count = segClients.length;
    const ltvSum = segClients.reduce((sum, c) => sum + c.ltv, 0);
    const unitsSum = segClients.reduce((sum, c) => sum + c.totalUnits, 0);
    return { count, ltvSum, unitsSum };
  };

  // Summary Metrics (Registered vs. Leads)
  const registered = customers.filter(c => c.isRegistered);
  const leads = customers.filter(c => !c.isRegistered);

  const registeredLtv = registered.reduce((sum, c) => sum + c.ltv, 0);
  const registeredAov = registered.reduce((sum, c) => sum + c.frequency, 0) > 0 
    ? Math.round(registeredLtv / registered.reduce((sum, c) => sum + c.frequency, 0))
    : 0;

  const leadsLtv = leads.reduce((sum, c) => sum + c.ltv, 0);
  const leadsAov = leads.reduce((sum, c) => sum + c.frequency, 0) > 0 
    ? Math.round(leadsLtv / leads.reduce((sum, c) => sum + c.frequency, 0))
    : 0;

  // Filtered List
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone.includes(searchQuery);
    
    const matchesSegment = !selectedSegment || c.segment === selectedSegment;
    
    const matchesType = activeTypeFilter === "all" || 
                        (activeTypeFilter === "registered" && c.isRegistered) ||
                        (activeTypeFilter === "leads" && !c.isRegistered);

    return matchesSearch && matchesSegment && matchesType;
  });

  // Launch campaign for a single client
  const triggerSingleCampaign = (customer: SimCustomerRFM) => {
    setSelectedCustomerForMail(customer);
    setCampaignModalOpen(true);
  };

  const handleSendSingleCampaign = () => {
    if (!selectedCustomerForMail) return;
    setSendingCampaign(true);
    setTimeout(() => {
      setSendingCampaign(false);
      setCampaignModalOpen(false);
      showToast(`¡Correo de campaña enviado a ${selectedCustomerForMail.name} (${selectedCustomerForMail.email})!`, "success");
      setSelectedCustomerForMail(null);
    }, 1200);
  };

  // Launch campaign for the entire active segment
  const handleSendSegmentCampaign = () => {
    if (!selectedSegment) return;
    const targets = customers.filter(c => c.segment === selectedSegment);
    if (targets.length === 0) return;
    
    setSendingCampaign(true);
    setTimeout(() => {
      setSendingCampaign(false);
      showToast(`¡Campaña masiva enviada a los ${targets.length} clientes del segmento ${selectedSegment}!`, "success");
    }, 1500);
  };

  // Launch campaign for checkout leads
  const handleSendLeadCampaign = () => {
    if (leads.length === 0) return;
    
    const campaignNames = {
      registro: "Conversión a Socio (200 Puntos Gratis)",
      segunda: "Cupón de Incentivo 2ª Compra (10% OFF)",
      encuesta: "Encuesta de Calidad + Regalo Croissant"
    };
    
    const activeCampaignName = campaignNames[selectedLeadCampaign];
    
    setSendingCampaign(true);
    setTimeout(() => {
      setSendingCampaign(false);
      showToast(`¡Campaña "${activeCampaignName}" enviada con éxito a los ${leads.length} leads de checkout!`, "success");
    }, 1500);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Segment metadata for thermometer and CRO suggestions
  const segmentConfig = {
    Champions: {
      title: "Campeones",
      desc: "Tus mejores clientes. Compran frecuentemente, gastan mucho y su última compra fue hace muy poco.",
      pillClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      borderClass: "border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/[0.02] shadow-emerald-500/5",
      activeBorderClass: "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      textClass: "text-emerald-400",
      suggestion: "Consiente a tus campeones. Ofrece acceso exclusivo a lanzamientos de productos, incrementa en un 50% su acumulación de puntos de fidelidad de manera permanente y envíales un regalo físico o nota de agradecimiento escrita a mano con su próximo pedido.",
      actionText: "Enviar Premio Especial VIP"
    },
    Loyal: {
      title: "Fieles",
      desc: "Compran con regularidad y responden bien a tus promociones. Valor de vida estable.",
      pillClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      borderClass: "border-blue-500/20 hover:border-blue-500 bg-blue-500/[0.02] shadow-blue-500/5",
      activeBorderClass: "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      textClass: "text-blue-400",
      suggestion: "Fomenta la lealtad y el up-selling. Recomienda productos premium complementarios (como nuestra Tarta de Limón artesanal o viennoiserie) y ofréceles un código de descuento por recomendación (Refer-a-Friend) de $3.000 CLP para atraer nuevos clientes.",
      actionText: "Enviar Campaña de Referidos"
    },
    New: {
      title: "Nuevos",
      desc: "Clientes que realizaron su primera compra hace pocos días. Tienen alto potencial.",
      pillClass: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      borderClass: "border-cyan-500/20 hover:border-cyan-500 bg-cyan-500/[0.02] shadow-cyan-500/5",
      activeBorderClass: "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      textClass: "text-cyan-400",
      suggestion: "Consolida la segunda compra. Envía una secuencia automatizada explicando el proceso artesanal de masa madre de 48h de fermentación y otorga un cupón de 15% de descuento exclusivo para su segundo pedido antes de que pasen 10 días.",
      actionText: "Enviar Cupón de 2ª Compra"
    },
    "At Risk": {
      title: "En Riesgo",
      desc: "Clientes habituales que no han comprado en más de 12 días. Se están enfriando.",
      pillClass: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
      borderClass: "border-orange-500/20 hover:border-orange-500 bg-orange-500/[0.02] shadow-orange-500/5",
      activeBorderClass: "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]",
      textClass: "text-orange-400",
      suggestion: "Recuperación de urgencia. Envía un correo con el asunto 'Te extrañamos en el horno' conteniendo un cupón de descuento agresivo del 20% CLP con validez limitada a 48 horas. La escasez de tiempo incrementa la tasa de conversión en este grupo.",
      actionText: "Lanzar Alerta 'Te Extrañamos'"
    },
    Hibernating: {
      title: "Hibernando",
      desc: "Compradores esporádicos que no registran actividad en más de 20 días. Riesgo de pérdida.",
      pillClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      borderClass: "border-rose-500/20 hover:border-rose-500 bg-rose-500/[0.02] shadow-rose-500/5",
      activeBorderClass: "border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]",
      textClass: "text-rose-400",
      suggestion: "Campaña de reactivación fría. Otorga un beneficio directo de bajo costo para el local pero de alto valor percibido (ej. un croissant o baguette gratis en la compra de $5.000 CLP) para motivar la reactivación física del cliente.",
      actionText: "Enviar Promo de Reactivación"
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-24 right-8 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-[#1c1c1c] border border-gold/20 text-white px-6 py-3.5 rounded-lg shadow-2xl flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-gold animate-ping"></span>
            <span className="text-xs uppercase tracking-widest font-bold font-sans">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-white tracking-wide flex items-center gap-3">
          <Users className="w-6 h-6 text-gold" />
          Análisis y Segmentación de Clientes
        </h1>
        <p className="text-sm text-gray-400 mt-2">Valida el estado de tus clientes bajo el modelo RFM (Recencia, Frecuencia, Monetario) y optimiza tu valor de vida de cliente (LTV).</p>
      </div>

      {/* Comparison Grid: Registered vs Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: Registered Customers */}
        <div 
          onClick={() => {
            setActiveTypeFilter(activeTypeFilter === "registered" ? "all" : "registered");
            setSelectedSegment(null);
          }}
          className={`bg-[#161616] p-6 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group cursor-pointer transition-all duration-300 border ${
            activeTypeFilter === "registered" 
              ? "border-gold bg-gold/[0.02] shadow-[0_0_15px_rgba(212,175,55,0.05)]" 
              : "border-white/5 hover:border-gold/30"
          }`}
        >
          <div className="space-y-2 z-10">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Clientes Registrados (Fidelizados)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif text-white font-bold">{registered.length}</span>
              <span className="text-xs text-gray-400">usuarios</span>
            </div>
            <div className="pt-2 grid grid-cols-2 gap-4 border-t border-white/5">
              <div>
                <span className="text-[9px] text-gray-500 block">Venta Acumulada</span>
                <span className="text-sm font-mono text-gold font-bold">{formatCLP(registeredLtv)}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 block">Ticket Promedio (AOV)</span>
                <span className="text-sm font-mono text-white">{formatCLP(registeredAov)}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gold/5 border border-gold/10 rounded-full text-gold group-hover:scale-110 transition-transform duration-300">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold/2 rounded-full blur-2xl -mr-12 -mt-12"></div>
        </div>

        {/* Card: Leads / Guests */}
        <div 
          onClick={() => {
            setActiveTypeFilter(activeTypeFilter === "leads" ? "all" : "leads");
            setSelectedSegment(null);
          }}
          className={`bg-[#161616] p-6 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group cursor-pointer transition-all duration-300 border ${
            activeTypeFilter === "leads" 
              ? "border-blue-500 bg-blue-500/[0.02] shadow-[0_0_15px_rgba(59,130,246,0.05)]" 
              : "border-white/5 hover:border-blue-500/30"
          }`}
        >
          <div className="space-y-2 z-10">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Leads de Checkout (Comprador Invitado)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif text-white font-bold">{leads.length}</span>
              <span className="text-xs text-gray-400">invitados</span>
            </div>
            <div className="pt-2 grid grid-cols-2 gap-4 border-t border-white/5">
              <div>
                <span className="text-[9px] text-gray-500 block">Venta Acumulada</span>
                <span className="text-sm font-mono text-gold font-bold">{formatCLP(leadsLtv)}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 block">Ticket Promedio (AOV)</span>
                <span className="text-sm font-mono text-white">{formatCLP(leadsAov)}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform duration-300">
            <UserPlus className="w-8 h-8" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/2 rounded-full blur-2xl -mr-12 -mt-12"></div>
        </div>
      </div>

      {/* Main Grid: Bento Segment Thermometer + Suggestion Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Bento Grid: 5 Segments Thermometer (Left) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Termómetro de Segmentos Clientes (RFM)</h3>
            {selectedSegment && (
              <button 
                onClick={() => setSelectedSegment(null)}
                className="text-[10px] text-gold hover:text-gold-hover font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar Filtro
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(Object.keys(segmentConfig) as Array<keyof typeof segmentConfig>).map((key) => {
              const config = segmentConfig[key];
              const stats = getSegmentStats(key);
              const isActive = selectedSegment === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedSegment(isActive ? null : key)}
                  className={`p-4 rounded-xl border flex flex-col justify-between text-left transition-all duration-300 h-40 cursor-pointer ${
                    isActive ? config.activeBorderClass : config.borderClass
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${config.pillClass}`}>
                      {config.title}
                    </span>
                    <p className="text-2xl font-serif text-white font-bold pt-1">{stats.count}</p>
                    <p className="text-[10px] text-gray-500">clientes</p>
                  </div>
                  
                  <div className="border-t border-white/5 pt-2 w-full space-y-0.5 font-mono text-[10px]">
                    <p className="text-gold font-bold">{formatCLP(stats.ltvSum)}</p>
                    <p className="text-gray-500">{stats.unitsSum} uds. vendidas</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CRO Strategy & Suggestions Box */}
          <div className="bg-[#161616] border border-white/5 rounded-xl p-6 relative overflow-hidden shadow-md">
            {selectedSegment ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${segmentConfig[selectedSegment].pillClass}`}>
                      Estrategia CRO: {segmentConfig[selectedSegment].title}
                    </span>
                    <span className="text-xs text-gray-500">• Segmento Seleccionado</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-serif text-white font-bold">Comportamiento del Segmento</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{segmentConfig[selectedSegment].desc}</p>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-4 flex gap-3.5 items-start">
                  <Zap className="w-5 h-5 text-gold shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Acción de Marketing Recomendada</h5>
                    <p className="text-xs text-gray-300 leading-relaxed font-light font-sans">
                      {segmentConfig[selectedSegment].suggestion}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSendSegmentCampaign}
                    className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-6 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    {segmentConfig[selectedSegment].actionText} ({getSegmentStats(selectedSegment).count} Clientes)
                  </button>
                </div>
              </div>
            ) : activeTypeFilter === "leads" ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Estrategia CRO: Conversión de Leads
                    </span>
                    <span className="text-xs text-gray-500">• Campañas para Compradores Invitados</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-serif text-white font-bold">Comportamiento de los Leads de Checkout</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Son usuarios que completaron una compra rápida sin crear una cuenta. Muestran alta intención de compra, pero tienen un menor porcentaje de retención y recompra a largo plazo al no acumular puntos ni recibir promociones personalizadas.
                  </p>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-4 space-y-4">
                  <div className="flex gap-3.5 items-start">
                    <Zap className="w-5 h-5 text-gold shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <h5 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Campañas Ideales Recomendadas</h5>
                      <p className="text-xs text-gray-300 leading-relaxed font-light">
                        Selecciona el tipo de campaña que deseas enviar a tus <strong>{leads.length} leads</strong> para incentivar su registro y fidelización.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadCampaign("registro")}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                        selectedLeadCampaign === "registro" 
                          ? "border-gold bg-gold/5 text-white animate-pulse" 
                          : "border-white/5 bg-white/[0.01] hover:border-white/10 text-gray-400"
                      }`}
                    >
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5 mb-1">
                        <UserPlus className="w-3.5 h-3.5 text-gold" />
                        Conversión a Socio
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Regala 200 puntos de fidelización si crean su cuenta.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLeadCampaign("segunda")}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                        selectedLeadCampaign === "segunda" 
                          ? "border-gold bg-gold/5 text-white" 
                          : "border-white/5 bg-white/[0.01] hover:border-white/10 text-gray-400"
                      }`}
                    >
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-gold" />
                        Incentivo 2ª Compra
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Envía cupón de 10% OFF exclusivo para recompra.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLeadCampaign("encuesta")}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                        selectedLeadCampaign === "encuesta" 
                          ? "border-gold bg-gold/5 text-white" 
                          : "border-white/5 bg-white/[0.01] hover:border-white/10 text-gray-400"
                      }`}
                    >
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5 mb-1">
                        <Activity className="w-3.5 h-3.5 text-gold" />
                        Encuesta + Regalo
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Ofrece croissant gratis en local por responder encuesta.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSendLeadCampaign}
                    disabled={sendingCampaign}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                  >
                    {sendingCampaign ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Enviar Campaña Masiva ({leads.length} Leads)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : activeTypeFilter === "registered" ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gold/10 text-gold border border-gold/20">
                      Estrategia CRO: Clientes Registrados
                    </span>
                    <span className="text-xs text-gray-500">• Fidelización Activa</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-serif text-white font-bold">Comportamiento de Clientes Registrados</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Son usuarios que han creado una cuenta formal y acumulan puntos con cada compra. Responden mejor a incentivos de valor y personalización de marca que a descuentos directos.
                  </p>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-4 flex gap-3.5 items-start">
                  <Zap className="w-5 h-5 text-gold shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Acción General Recomendada</h5>
                    <p className="text-xs text-gray-300 leading-relaxed font-light font-sans">
                      Utiliza los filtros del <strong>Termómetro de Segmentos (Champions, Loyal, New, etc.)</strong> arriba para desplegar campañas microsegmentadas y optimizar el retorno de inversión de tus campañas.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto text-gray-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-serif text-white font-bold">Termómetro de Conversión</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed mt-1">
                    Selecciona cualquiera de las tarjetas de segmento superiores, o haz clic en las tarjetas de **Registrados** o **Leads** para activar la estrategia de retención o conversión CRO recomendada por el bloque creativo.
                  </p>
                </div>
              </div>
            )}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/[0.01] rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>
        </div>

        {/* Small Segment Distribution Info (Right Sidebar) */}
        <div className="xl:col-span-4 bg-[#161616] border border-white/5 rounded-xl p-6 space-y-6 shadow-xl h-full flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-gold" />
              Diagnóstico de Churn
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs text-orange-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Clientes "En Riesgo"</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Tienes <strong className="text-white font-bold">{getSegmentStats("At Risk").count} clientes</strong> que solían comprar recurrentemente pero llevan más de 12 días sin hacerlo. Lanza la campaña de recuperación con cupón del 20% para evitar la fuga.
                </p>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Clientes "Hibernando"</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Hay <strong className="text-white font-bold">{getSegmentStats("Hibernating").count} clientes</strong> inactivos de más de 20 días. Requieren una oferta agresiva o incentivo directo en local físico para volver a activarse.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0f0f] border border-white/5 rounded-lg p-4 space-y-3 mt-4 text-[10px] leading-relaxed text-gray-400 font-sans">
            <span className="font-bold text-gray-300 uppercase tracking-wider block">💡 Insights de Conversión:</span>
            <p>1. Los <strong>Campeones</strong> representan el motor principal del negocio; asegurar un doble punto de fidelidad incentiva la recurrencia continua.</p>
            <p>2. Un alto ticket promedio en <strong>Leads</strong> indica que tus campañas de redes sociales están atrayendo tráfico nuevo. Invítalos a registrarse ofreciendo 100 puntos de bienvenida.</p>
          </div>
        </div>
      </div>

      {/* Detailed Customer Table */}
      <div className="space-y-4 border-t border-white/5 pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Base de Clientes Detallada</h3>
            <span className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              Mostrando {filteredCustomers.length} de {customers.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Type Switcher */}
            <div className="flex bg-[#0f0f0f] p-1 rounded border border-white/5">
              <button
                onClick={() => setActiveTypeFilter("all")}
                className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  activeTypeFilter === "all" ? "bg-gold text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveTypeFilter("registered")}
                className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  activeTypeFilter === "registered" ? "bg-gold text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Registrados
              </button>
              <button
                onClick={() => setActiveTypeFilter("leads")}
                className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  activeTypeFilter === "leads" ? "bg-gold text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Leads
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por cliente, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/45 border border-white/5 text-xs text-white rounded px-4 py-2 pl-9 outline-none focus:border-gold w-64"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/30 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Email / Teléfono</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-center">Recencia (Días)</th>
                  <th className="p-3 text-center">Frecuencia</th>
                  <th className="p-3 text-center">LTV Acumulado</th>
                  <th className="p-3 text-center">Unidades</th>
                  <th className="p-3 text-center">Segmento RFM</th>
                  <th className="p-3 text-right">Acción Comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-semibold text-white">{c.name}</td>
                      <td className="p-3 font-mono space-y-0.5">
                        <p className="text-gray-300">{c.email}</p>
                        <p className="text-[10px] text-gray-500">{c.phone}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          c.isRegistered ? "bg-gold/10 text-gold border border-gold/15" : "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                        }`}>
                          {c.isRegistered ? "Registrado" : "Lead / Invitado"}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{c.recencyDays} días</td>
                      <td className="p-3 text-center font-mono">{c.frequency} compras</td>
                      <td className="p-3 text-center font-mono text-gold font-bold">{formatCLP(c.ltv)}</td>
                      <td className="p-3 text-center font-mono">{c.totalUnits} uds.</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${segmentConfig[c.segment].pillClass}`}>
                          {segmentConfig[c.segment].title}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => triggerSingleCampaign(c)}
                          className="px-3 py-1 bg-white/5 hover:bg-gold hover:text-black border border-white/5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                        >
                          Lanzar Campaña
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500 italic">No se encontraron clientes para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Email Campaign Details */}
      {campaignModalOpen && selectedCustomerForMail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-md rounded-lg border border-charcoal-border shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-charcoal-border mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Lanzador de Campaña Automatizada
              </span>
              <button 
                onClick={() => {
                  setCampaignModalOpen(false);
                  setSelectedCustomerForMail(null);
                }}
                className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-black/20 p-3 rounded border border-white/5 text-xs text-gray-300 space-y-1">
                <p><span className="font-bold text-gray-400">Cliente:</span> {selectedCustomerForMail.name}</p>
                <p><span className="font-bold text-gray-400">Correo:</span> {selectedCustomerForMail.email}</p>
                <p className="flex items-center gap-2">
                  <span className="font-bold text-gray-400">Segmento RFM:</span> 
                  <span className={`inline-block px-2 py-0.2 rounded-full text-[9px] font-bold ${segmentConfig[selectedCustomerForMail.segment].pillClass}`}>
                    {segmentConfig[selectedCustomerForMail.segment].title}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Asunto del Correo</label>
                <input 
                  type="text" 
                  readOnly
                  value={
                    selectedCustomerForMail.segment === "Champions" ? "¡Gracias por ser parte de nuestra realeza! Premio VIP para ti" :
                    selectedCustomerForMail.segment === "Loyal" ? "Tenemos algo especial para nuestro panadero fiel favorito" :
                    selectedCustomerForMail.segment === "New" ? "¡Bienvenido a Pan de Rey! Tu cupón de segunda compra te espera" :
                    selectedCustomerForMail.segment === "At Risk" ? "Te extrañamos en el horno... ¡Aquí tienes 20% de descuento!" :
                    "¡Reactivamos tus mañanas! Te regalamos un croissant en tu próxima visita"
                  }
                  className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cuerpo del Correo (Estrategia Recomendada)</label>
                <div className="bg-[#0f0f0f] border border-white/10 p-4 rounded text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto">
                  <p className="mb-2">Hola <strong>{selectedCustomerForMail.name}</strong>,</p>
                  <p className="font-light">
                    {segmentConfig[selectedCustomerForMail.segment].suggestion}
                  </p>
                  <p className="mt-3 text-[10px] text-gray-500 italic">Enviado por: Pan de Rey CRM Automatizado</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-5 mt-3 border-t border-white/5">
              <button 
                onClick={() => {
                  setCampaignModalOpen(false);
                  setSelectedCustomerForMail(null);
                }}
                className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendSingleCampaign}
                disabled={sendingCampaign}
                className="flex-1 bg-gold hover:bg-gold-hover text-black py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {sendingCampaign ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" /> Enviar Correo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
