"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Ticket, 
  CreditCard, 
  Shield, 
  Gift, 
  Calendar, 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Info
} from "lucide-react";
import { 
  getLocalSettings, 
  saveLocalSettings, 
  defaultSettings, 
  getLocalProducts, 
  type SimSettings, 
  type SimRedemptionReward, 
  type SimProduct 
} from "@/utils/dbSim";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<SimSettings | null>(null);
  const [products, setProducts] = useState<SimProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"ticket" | "payment" | "security" | "loyalty" | "campaign" | "seo">("ticket");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Audit Log filters
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<"all" | "Exitoso" | "Advertencia" | "Bloqueado">("all");

  // New Loyalty Reward form state
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState(100);
  const [newRewardType, setNewRewardType] = useState<"fixed" | "percent" | "free_shipping">("fixed");
  const [newRewardValue, setNewRewardValue] = useState(1000);

  useEffect(() => {
    setMounted(true);
    setDraft(getLocalSettings());
    setProducts(getLocalProducts());
  }, []);

  if (!mounted || !draft) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <div className="text-white tracking-widest text-sm uppercase animate-pulse">Cargando Ajustes...</div>
      </div>
    );
  }

  const handleFieldChange = (field: keyof SimSettings, value: any) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : null);
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      saveLocalSettings(draft);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 800);
  };

  const handleDiscard = () => {
    if (confirm("¿Estás seguro de que deseas descartar los cambios no guardados?")) {
      setDraft(getLocalSettings());
      setSaveStatus("idle");
    }
  };

  const handleRestoreDefault = () => {
    if (confirm("¿Deseas restablecer los parámetros del sistema a los valores de fábrica? Esto sobrescribirá tus configuraciones actuales.")) {
      setDraft(defaultSettings);
      setSaveStatus("idle");
    }
  };

  // WhatsApp checkout message preview builder
  const getSimulatedWhatsAppMessage = () => {
    if (!draft.whatsappMessageTemplate) return "";
    return draft.whatsappMessageTemplate
      .replace(/{pedido_id}/g, "order-sim-0234")
      .replace(/{cliente}/g, "María González")
      .replace(/{monto}/g, "$25.400 CLP");
  };

  // Loyalty Rewards actions
  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle) return;

    const newReward: SimRedemptionReward = {
      id: `reward-${Date.now()}`,
      title: newRewardTitle,
      pointsCost: newRewardPoints,
      rewardType: newRewardType,
      rewardValue: newRewardType === "free_shipping" ? 0 : newRewardValue
    };

    setDraft(prev => {
      if (!prev) return null;
      return {
        ...prev,
        redemptionRewards: [...prev.redemptionRewards, newReward]
      };
    });

    // Reset Form
    setNewRewardTitle("");
    setNewRewardPoints(100);
    setNewRewardValue(1000);
  };

  const handleDeleteReward = (id: string) => {
    setDraft(prev => {
      if (!prev) return null;
      return {
        ...prev,
        redemptionRewards: prev.redemptionRewards.filter(r => r.id !== id)
      };
    });
  };

  // Event product association toggling
  const handleToggleEventProduct = (prodId: number) => {
    const isSelected = draft.eventProductIds.includes(prodId);
    let updated: number[];
    if (isSelected) {
      updated = draft.eventProductIds.filter(id => id !== prodId);
    } else {
      updated = [...draft.eventProductIds, prodId];
    }
    handleFieldChange("eventProductIds", updated);
  };

  // Filtered Audit Logs
  const filteredLogs = draft.securityAuditLogs.filter(log => {
    const matchesSearch = log.event.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.ip.includes(auditSearch);
    const matchesFilter = auditFilter === "all" || log.status === auditFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-wide flex items-center gap-3">
            <Settings className="w-6 h-6 text-gold" />
            Configuraciones del Sistema
          </h1>
          <p className="text-sm text-gray-400 mt-1">Modifica variables de impresión, medios de pago, seguridad, fidelización y SEO.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRestoreDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs uppercase font-bold tracking-wider rounded border border-red-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Valores por Defecto
          </button>
        </div>
      </div>

      {/* Main Grid: Tabs Menu + Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Sidebar Tabs Navigation */}
        <div className="lg:col-span-3 flex flex-col gap-1.5 bg-[#161616] p-3 rounded-xl border border-white/5 shadow-md">
          <button
            onClick={() => setActiveTab("ticket")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "ticket" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            Ticket de Despacho
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "payment" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            Medios de Pago
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "security" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Seguridad y Auditoría
          </button>
          <button
            onClick={() => setActiveTab("loyalty")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "loyalty" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            Programa de Puntos
          </button>
          <button
            onClick={() => setActiveTab("campaign")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "campaign" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Eventos y Reservas
          </button>
          <button
            onClick={() => setActiveTab("seo")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "seo" ? "bg-gold text-black" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            Redes y SEO Global
          </button>
        </div>

        {/* Right Side: Tab Panel Content Container */}
        <div className="lg:col-span-9 flex flex-col bg-[#161616] border border-white/5 rounded-xl shadow-2xl overflow-hidden min-h-[550px]">
          
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            
            {/* TICKET CONFIGURATION PANEL */}
            {activeTab === "ticket" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in duration-300">
                <div className="space-y-6">
                  <h2 className="text-lg font-serif text-white border-b border-white/10 pb-2 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-gold" />
                    Etiquetas de Despacho (Ticket de Entrega)
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Personaliza los datos impresos en las comandas y etiquetas adhesivas para los pedidos en reparto y retiros.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Nombre Comercial de la Empresa</label>
                      <input 
                        type="text" 
                        value={draft.ticketCompanyName}
                        onChange={(e) => handleFieldChange("ticketCompanyName", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">RUT Comercial</label>
                      <input 
                        type="text" 
                        value={draft.ticketRut}
                        onChange={(e) => handleFieldChange("ticketRut", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Dirección del Local</label>
                      <input 
                        type="text" 
                        value={draft.ticketAddress}
                        onChange={(e) => handleFieldChange("ticketAddress", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Teléfono impreso</label>
                      <input 
                        type="text" 
                        value={draft.ticketPhone}
                        onChange={(e) => handleFieldChange("ticketPhone", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Notas al Pie del Ticket</label>
                      <textarea 
                        rows={3}
                        value={draft.ticketNotes}
                        onChange={(e) => handleFieldChange("ticketNotes", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none resize-none"
                        placeholder="Recomendaciones de guardado o agradecimientos..."
                      />
                    </div>
                  </div>
                </div>

                {/* VISUAL RECEIPT PREVIEW (Premium mock) */}
                <div className="bg-[#0e0e0e] p-6 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Vista Previa de Comanda Térmica</span>
                  
                  <div className="bg-white text-black p-6 rounded shadow-2xl max-w-xs w-full border-2 border-dashed border-gray-400 font-mono text-[11px] space-y-4 select-none">
                    <div className="text-center font-bold text-sm tracking-wider">*** PAN DE REY ***</div>
                    
                    <div className="text-center border-b border-dashed border-gray-300 pb-2 space-y-0.5">
                      <p className="font-bold uppercase">{draft.ticketCompanyName}</p>
                      <p>RUT: {draft.ticketRut}</p>
                      <p className="text-[10px]">{draft.ticketAddress}</p>
                      <p>Fono: {draft.ticketPhone}</p>
                    </div>

                    <div className="border-b border-dashed border-gray-300 pb-2 space-y-1">
                      <p className="font-bold flex justify-between"><span>CANT. DETALLE</span><span>TOTAL</span></p>
                      <p className="flex justify-between"><span>1x Masa Madre Rústico</span><span>$4.500</span></p>
                      <p className="flex justify-between"><span>2x Croissant de Mantequilla</span><span>$4.400</span></p>
                      <p className="flex justify-between"><span>1x Baguette Tradicional</span><span>$1.800</span></p>
                    </div>

                    <div className="border-b border-dashed border-gray-300 pb-2 space-y-1">
                      <p className="flex justify-between"><span>Subtotal:</span><span>$10.700</span></p>
                      <p className="flex justify-between text-red-600"><span>Descuento (Canje):</span><span>-$2.000</span></p>
                      <p className="flex justify-between font-bold text-xs pt-1"><span>TOTAL NETO:</span><span>$8.700</span></p>
                    </div>

                    <div className="text-center text-[10px] italic leading-relaxed pt-1 whitespace-pre-wrap">
                      "{draft.ticketNotes}"
                    </div>

                    <div className="text-center pt-2">
                      <div className="h-6 bg-black w-full flex items-center justify-center text-white text-[7px] font-sans font-bold tracking-[0.25em] mb-1">
                        ||||||||||||||||||||||||||||||||
                      </div>
                      <p className="text-[9px]">Pedido ID: order-sim-0042</p>
                      <p className="text-[8px] text-gray-500">Fecha: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENTS GATEWAYS PANEL */}
            {activeTab === "payment" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <h2 className="text-lg font-serif text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gold" />
                    Pasarelas de Pago e Integraciones
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Mercado Pago API Setup */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${draft.mercadoPagoActive ? "bg-blue-400" : "bg-gray-600"}`}></span>
                        Mercado Pago (Online)
                      </h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={draft.mercadoPagoActive}
                          onChange={(e) => handleFieldChange("mercadoPagoActive", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Clave Pública (Public Key)</label>
                        <input 
                          type="text" 
                          disabled={!draft.mercadoPagoActive}
                          value={draft.mercadoPagoPublicKey}
                          onChange={(e) => handleFieldChange("mercadoPagoPublicKey", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none disabled:opacity-40"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Token de Acceso (Access Token)</label>
                        <input 
                          type="password" 
                          disabled={!draft.mercadoPagoActive}
                          value={draft.mercadoPagoAccessToken}
                          onChange={(e) => handleFieldChange("mercadoPagoAccessToken", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none disabled:opacity-40"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="mpSandbox"
                          disabled={!draft.mercadoPagoActive}
                          checked={draft.mercadoPagoSandbox}
                          onChange={(e) => handleFieldChange("mercadoPagoSandbox", e.target.checked)}
                          className="rounded border-white/10 bg-black/45 text-gold focus:ring-gold"
                        />
                        <label htmlFor="mpSandbox" className="text-xs text-gray-400 select-none">Habilitar Modo Prueba (Sandbox)</label>
                      </div>
                    </div>
                  </div>

                  {/* Bank Transfer Setup */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${draft.bankTransferActive ? "bg-green-400" : "bg-gray-600"}`}></span>
                        Transferencia Electrónica
                      </h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={draft.bankTransferActive}
                          onChange={(e) => handleFieldChange("bankTransferActive", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Banco</label>
                          <input 
                            type="text" 
                            disabled={!draft.bankTransferActive}
                            value={draft.bankTransferBank}
                            onChange={(e) => handleFieldChange("bankTransferBank", e.target.value)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white disabled:opacity-40"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Tipo de Cuenta</label>
                          <input 
                            type="text" 
                            disabled={!draft.bankTransferActive}
                            value={draft.bankTransferAccountType}
                            onChange={(e) => handleFieldChange("bankTransferAccountType", e.target.value)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">N° de Cuenta</label>
                          <input 
                            type="text" 
                            disabled={!draft.bankTransferActive}
                            value={draft.bankTransferAccountNumber}
                            onChange={(e) => handleFieldChange("bankTransferAccountNumber", e.target.value)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white disabled:opacity-40"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">RUT Destinatario</label>
                          <input 
                            type="text" 
                            disabled={!draft.bankTransferActive}
                            value={draft.bankTransferRut}
                            onChange={(e) => handleFieldChange("bankTransferRut", e.target.value)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Email para Comprobante</label>
                        <input 
                          type="email" 
                          disabled={!draft.bankTransferActive}
                          value={draft.bankTransferEmail}
                          onChange={(e) => handleFieldChange("bankTransferEmail", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Checkout Integration */}
                <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${draft.whatsappCheckoutActive ? "bg-green-500" : "bg-gray-600"}`}></span>
                      WhatsApp Assisted Checkout (Ventas Asistidas)
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={draft.whatsappCheckoutActive}
                        onChange={(e) => handleFieldChange("whatsappCheckoutActive", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Número de WhatsApp de Contacto (con código país)</label>
                        <input 
                          type="text" 
                          disabled={!draft.whatsappCheckoutActive}
                          value={draft.whatsappPhone}
                          onChange={(e) => handleFieldChange("whatsappPhone", e.target.value)}
                          placeholder="Ej: +56912345678"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Plantilla de Mensaje Automatizado</label>
                        <textarea 
                          rows={4}
                          disabled={!draft.whatsappCheckoutActive}
                          value={draft.whatsappMessageTemplate}
                          onChange={(e) => handleFieldChange("whatsappMessageTemplate", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40 resize-none"
                          placeholder="Configura el mensaje que enviará el cliente por WhatsApp..."
                        />
                        <p className="text-[9px] text-gray-500 mt-1.5">
                          Puedes usar las variables: <code className="text-gold font-mono">{`{pedido_id}`}</code>, <code className="text-gold font-mono">{`{cliente}`}</code>, y <code className="text-gold font-mono">{`{monto}`}</code>.
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/35 p-4 rounded border border-white/5 space-y-3 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2">Simulación de Mensaje de Entrada</span>
                        <div className="bg-[#0b141a] text-[#e9edef] p-4 rounded-lg text-xs leading-relaxed max-w-sm relative font-sans self-start shadow-md">
                          <p className="whitespace-pre-wrap">{getSimulatedWhatsAppMessage()}</p>
                          <span className="absolute bottom-1.5 right-2 text-[9px] text-[#8696a0] font-sans">13:16 ✓✓</span>
                        </div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-[10px] text-green-400 flex items-start gap-2.5">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Cuando el cliente opte por pagar mediante Transferencia bancaria, se le mostrará un botón de confirmación directa a WhatsApp con este mensaje listo para enviar.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & AUDIT LOGS PANEL */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-lg font-serif text-white border-b border-white/10 pb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gold" />
                  Políticas de Seguridad y Auditoría de Accesos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-1">
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Sesión Activa</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={draft.sessionTimeoutMinutes}
                        onChange={(e) => handleFieldChange("sessionTimeoutMinutes", parseInt(e.target.value) || 30)}
                        className="w-16 bg-[#0f0f0f] border border-white/10 p-2 rounded text-xs text-white text-center font-bold"
                      />
                      <span className="text-xs text-gray-400">Minutos de inactividad</span>
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-1">
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Fuerza Bruta Login</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={draft.maxLoginAttempts}
                        onChange={(e) => handleFieldChange("maxLoginAttempts", parseInt(e.target.value) || 5)}
                        className="w-16 bg-[#0f0f0f] border border-white/10 p-2 rounded text-xs text-white text-center font-bold"
                      />
                      <span className="text-xs text-gray-400">Intentos máximos</span>
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-1">
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Conexión Segura</span>
                    <div className="flex items-center gap-2 py-1">
                      <input 
                        type="checkbox" 
                        id="sslForce"
                        checked={draft.sslForced}
                        onChange={(e) => handleFieldChange("sslForced", e.target.checked)}
                        className="rounded border-white/10 bg-black/45 text-gold focus:ring-gold"
                      />
                      <label htmlFor="sslForce" className="text-xs text-gray-400 cursor-pointer select-none">Forzar HTTPS SSL</label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Lista Blanca de IPs de Administración (Separadas por coma)</label>
                  <input 
                    type="text" 
                    value={draft.ipWhitelist}
                    onChange={(e) => handleFieldChange("ipWhitelist", e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none"
                    placeholder="Ej: 192.168.1.1, 200.54.12.89"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Sólo los dispositivos con estas direcciones IP podrán ingresar al panel administrativo.</p>
                </div>

                {/* Audit Logs Table */}
                <div className="space-y-4 border-t border-white/5 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Logs de Seguridad de la Plataforma</h3>
                    
                    <div className="flex items-center gap-2">
                      {/* Search */}
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Buscar log..."
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          className="bg-black/45 border border-white/5 text-xs text-white rounded px-3 py-1.5 pl-8 outline-none focus:border-gold w-44"
                        />
                        <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* Filter Select */}
                      <select 
                        value={auditFilter}
                        onChange={(e: any) => setAuditFilter(e.target.value)}
                        className="bg-black/45 border border-white/5 text-xs text-white rounded px-2 py-1.5 outline-none focus:border-gold cursor-pointer"
                      >
                        <option value="all">Todos los logs</option>
                        <option value="Exitoso">Exitosos</option>
                        <option value="Advertencia">Advertencias</option>
                        <option value="Bloqueado">Bloqueados</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/15">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-black/40 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Fecha y Hora</th>
                            <th className="p-3">IP Origen</th>
                            <th className="p-3">Usuario</th>
                            <th className="p-3">Evento Operativo</th>
                            <th className="p-3 text-right">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredLogs.length > 0 ? (
                            filteredLogs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-3 font-mono text-gray-500 text-[10px]">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-3 font-mono text-gray-400">{log.ip}</td>
                                <td className="p-3 text-gray-300 font-semibold">{log.user}</td>
                                <td className="p-3 text-gray-400">{log.event}</td>
                                <td className="p-3 text-right">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                    log.status === "Exitoso" ? "bg-green-500/10 text-green-400" :
                                    log.status === "Advertencia" ? "bg-yellow-500/10 text-yellow-400" :
                                    "bg-red-500/10 text-red-400"
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-gray-500 italic">Ningún log coincide con los filtros aplicados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOYALTY PROGRAM (FIDELIZACION Y CANJES) PANEL */}
            {activeTab === "loyalty" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h2 className="text-lg font-serif text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-gold" />
                    Programa de Fidelización y Canje de Puntos
                  </h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={draft.loyaltyActive}
                      onChange={(e) => handleFieldChange("loyaltyActive", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Point values configuration */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest text-gold mb-2">Equivalencia de Puntos</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase block">CLP Gastado por 1 Punto</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">$</span>
                          <input 
                            type="number" 
                            disabled={!draft.loyaltyActive}
                            value={draft.pesosPerPoint}
                            onChange={(e) => handleFieldChange("pesosPerPoint", parseInt(e.target.value) || 1000)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase block">Valor de 1 Punto en Cashback</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">$</span>
                          <input 
                            type="number" 
                            disabled={!draft.loyaltyActive}
                            value={draft.pointValueCashback}
                            onChange={(e) => handleFieldChange("pointValueCashback", parseInt(e.target.value) || 10)}
                            className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/35 rounded p-3 text-[10px] text-gray-400 space-y-1 font-mono leading-relaxed">
                      <p className="font-bold text-gray-300">Ejemplo de Cálculo:</p>
                      <p>• Compra de $10.000 CLP = <span className="text-gold">10 Puntos</span> acumulados.</p>
                      <p>• El cliente canjea 10 Puntos = <span className="text-gold">$100 CLP</span> de saldo a favor.</p>
                    </div>
                  </div>

                  {/* Add reward form */}
                  <form onSubmit={handleAddReward} className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest text-gold mb-2">Crear Opción de Canje</h3>
                    
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase block mb-1">Título de la Recompensa</label>
                      <input 
                        type="text" 
                        disabled={!draft.loyaltyActive}
                        placeholder="Ej: Descuento de $5.000 CLP"
                        value={newRewardTitle}
                        onChange={(e) => setNewRewardTitle(e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white focus:border-gold outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase block mb-1">Costo en Puntos</label>
                        <input 
                          type="number" 
                          disabled={!draft.loyaltyActive}
                          value={newRewardPoints}
                          onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 100)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase block mb-1">Tipo de Premio</label>
                        <select
                          disabled={!draft.loyaltyActive}
                          value={newRewardType}
                          onChange={(e: any) => setNewRewardType(e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white outline-none cursor-pointer focus:border-gold"
                        >
                          <option value="fixed">Descuento Neto ($)</option>
                          <option value="percent">Descuento Porcentual (%)</option>
                          <option value="free_shipping">Envío Gratis</option>
                        </select>
                      </div>
                    </div>

                    {newRewardType !== "free_shipping" && (
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase block mb-1">
                          Valor del Premio {newRewardType === "percent" ? "(%)" : "($ CLP)"}
                        </label>
                        <input 
                          type="number" 
                          disabled={!draft.loyaltyActive}
                          value={newRewardValue}
                          onChange={(e) => setNewRewardValue(parseInt(e.target.value) || 1000)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-2.5 rounded text-xs text-white focus:border-gold outline-none"
                        />
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={!draft.loyaltyActive || !newRewardTitle}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold hover:bg-gold-hover disabled:opacity-40 disabled:hover:bg-gold text-black rounded font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar al Catálogo
                    </button>
                  </form>
                </div>

                {/* Rewards catalog list */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Catálogo Vigente de Recompensas</h3>
                  
                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/30 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Título de Recompensa</th>
                          <th className="p-3">Tipo de Beneficio</th>
                          <th className="p-3 text-center">Valor Equivalente</th>
                          <th className="p-3 text-center">Costo en Puntos</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {draft.redemptionRewards.length > 0 ? (
                          draft.redemptionRewards.map((reward) => (
                            <tr key={reward.id} className="hover:bg-white/[0.01]">
                              <td className="p-3 font-semibold">{reward.title}</td>
                              <td className="p-3 text-gray-400">
                                {reward.rewardType === "fixed" ? "Descuento en Dinero" :
                                 reward.rewardType === "percent" ? "Descuento de Porcentaje" :
                                 "Despacho Gratis"}
                              </td>
                              <td className="p-3 text-center font-mono">
                                {reward.rewardType === "fixed" ? `$${reward.rewardValue.toLocaleString()} CLP` :
                                 reward.rewardType === "percent" ? `${reward.rewardValue}%` :
                                 "Envío Costo $0"}
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/10 text-gold border border-gold/15">
                                  {reward.pointsCost} Pts
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReward(reward.id)}
                                  className="text-red-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                  title="Eliminar recompensa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-gray-500 italic">No hay premios configurados en el catálogo de fidelización.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* EVENT & CAMPAIGN RESERVATION PANEL */}
            {activeTab === "campaign" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-300">
                <div className="xl:col-span-7 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h2 className="text-lg font-serif text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gold" />
                      Campañas Estacionales y Agendamiento
                    </h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={draft.eventActive}
                        onChange={(e) => handleFieldChange("eventActive", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black"></div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Nombre Comercial de la Campaña</label>
                      <input 
                        type="text" 
                        disabled={!draft.eventActive}
                        value={draft.eventName}
                        onChange={(e) => handleFieldChange("eventName", e.target.value)}
                        placeholder="Ej: Evento de Navidad"
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none disabled:opacity-40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Fecha de Inicio de Campaña</label>
                        <input 
                          type="date" 
                          disabled={!draft.eventActive}
                          value={draft.eventStartDate}
                          onChange={(e) => handleFieldChange("eventStartDate", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Fecha de Término de Campaña</label>
                        <input 
                          type="date" 
                          disabled={!draft.eventActive}
                          value={draft.eventEndDate}
                          onChange={(e) => handleFieldChange("eventEndDate", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Antelación de Cocina (Días mínimos de prep.)</label>
                        <input 
                          type="number" 
                          disabled={!draft.eventActive}
                          value={draft.eventMinPrepDays}
                          onChange={(e) => handleFieldChange("eventMinPrepDays", parseInt(e.target.value) || 2)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Límite Diario de Pedidos (Tope de Capacidad)</label>
                        <input 
                          type="number" 
                          disabled={!draft.eventActive}
                          value={draft.eventMaxOrdersPerDay}
                          onChange={(e) => handleFieldChange("eventMaxOrdersPerDay", parseInt(e.target.value) || 15)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white disabled:opacity-40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Aviso al Cliente en el Carrito</label>
                      <textarea 
                        rows={3}
                        disabled={!draft.eventActive}
                        value={draft.eventCustomerMessage}
                        onChange={(e) => handleFieldChange("eventCustomerMessage", e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white focus:border-gold outline-none resize-none disabled:opacity-40"
                        placeholder="Mensaje sobre la antelación y cupos..."
                      />
                    </div>

                    {/* Products selector grid */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Productos Exclusivos de la Campaña</label>
                      <div className="border border-white/5 rounded bg-black/35 p-3 max-h-48 overflow-y-auto space-y-2 divide-y divide-white/5">
                        {products.map((prod) => {
                          const isAssoc = draft.eventProductIds.includes(prod.id);
                          return (
                            <div key={prod.id} className="flex items-center justify-between pt-2 first:pt-0">
                              <div className="flex items-center gap-3">
                                {prod.image && (
                                  <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded object-cover border border-white/5" />
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-white">{prod.name}</p>
                                  <p className="text-[9px] text-gray-500">{prod.category} • ${prod.price.toLocaleString()} CLP</p>
                                </div>
                              </div>
                              <input 
                                type="checkbox" 
                                disabled={!draft.eventActive}
                                checked={isAssoc}
                                onChange={() => handleToggleEventProduct(prod.id)}
                                className="rounded border-white/10 bg-black/45 text-gold focus:ring-gold w-4 h-4 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISUAL RESERVATION CALENDAR PREVIEW (Premium mock) */}
                <div className="xl:col-span-5 bg-[#0e0e0e] p-6 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4 text-center">Calendario de Reserva y Capacidad</span>
                    
                    <div className="space-y-4">
                      {/* Simulated Month Header */}
                      <div className="flex items-center justify-between text-xs text-white font-bold font-serif pb-2 border-b border-white/5">
                        <span>Diciembre 2026</span>
                        <span className="text-gold text-[10px] uppercase font-bold tracking-wider">Campaña Activa</span>
                      </div>

                      {/* Calendar grid mock */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-500 mb-2">
                        <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold">
                        {/* Empty spacing for offset */}
                        <span></span><span></span><span></span><span></span>
                        <span className="p-1.5 text-gray-600">1</span>
                        <span className="p-1.5 text-gray-600">2</span>
                        <span className="p-1.5 text-gray-600">3</span>

                        <span className="p-1.5 text-gray-600">4</span>
                        <span className="p-1.5 text-gray-600">5</span>
                        <span className="p-1.5 text-gray-600">6</span>
                        <span className="p-1.5 text-gray-600">7</span>
                        {/* Event active days highlighted in gold/red alerts */}
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 5/15">8</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 8/15">9</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 12/15">10</span>

                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 4/15">11</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 7/15">12</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 10/15">13</span>
                        <span className="p-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/35" title="CUPOS COMPLETO (15/15)">14</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 3/15">15</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 6/15">16</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 9/15">17</span>

                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 11/15">18</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 13/15">19</span>
                        <span className="p-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/35" title="CUPOS COMPLETO (15/15)">20</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 5/15">21</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 9/15">22</span>
                        <span className="p-1.5 rounded-full bg-gold/10 text-gold border border-gold/25" title="Capacidad: 14/15">23</span>
                        <span className="p-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/35" title="CUPOS COMPLETO (15/15)">24</span>
                        
                        <span className="p-1.5 text-red-500/60" title="Local Cerrado por Navidad">25</span>
                        <span className="p-1.5 text-gray-600">26</span>
                        <span className="p-1.5 text-gray-600">27</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded p-3 text-[10px] text-gray-400 space-y-1 font-sans mt-6">
                    <p className="font-bold text-gray-300">Detalle Operativo del Evento:</p>
                    <p className="flex justify-between"><span>Días de campaña:</span><span className="text-gold">1 al 24 de Dic</span></p>
                    <p className="flex justify-between"><span>Tope diario:</span><span>{draft.eventMaxOrdersPerDay} pedidos</span></p>
                    <p className="flex justify-between"><span>Min. anticipación:</span><span>{draft.eventMinPrepDays} días</span></p>
                    <p className="flex justify-between"><span>Productos asociados:</span><span>{draft.eventProductIds.length} ítems</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* SOCIALS, ANALYTICS & SEO PANEL */}
            {activeTab === "seo" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in duration-300">
                <div className="space-y-6">
                  <h2 className="text-lg font-serif text-white border-b border-white/10 pb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gold" />
                    Códigos de Seguimiento y SEO Global
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Google Analytics ID</label>
                        <input 
                          type="text" 
                          value={draft.googleAnalyticsId}
                          onChange={(e) => handleFieldChange("googleAnalyticsId", e.target.value)}
                          placeholder="Ej: G-XXXXXXXX"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Google Tag Manager ID</label>
                        <input 
                          type="text" 
                          value={draft.googleTagManagerId}
                          onChange={(e) => handleFieldChange("googleTagManagerId", e.target.value)}
                          placeholder="Ej: GTM-XXXXXX"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Facebook Pixel ID</label>
                        <input 
                          type="text" 
                          value={draft.facebookPixelId}
                          onChange={(e) => handleFieldChange("facebookPixelId", e.target.value)}
                          placeholder="Ej: FB-PIXEL-XXXXXX"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Google Ads Conversion Token</label>
                        <input 
                          type="text" 
                          value={draft.googleAdsToken}
                          onChange={(e) => handleFieldChange("googleAdsToken", e.target.value)}
                          placeholder="Ej: AW-XXXXXXXXXX"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest text-gold">SEO Avanzado de la Tienda</h3>
                      
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Título de la Web por Defecto (Meta Title)</label>
                        <input 
                          type="text" 
                          value={draft.seoDefaultTitle}
                          onChange={(e) => handleFieldChange("seoDefaultTitle", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Meta Descripción</label>
                        <textarea 
                          rows={3}
                          value={draft.seoDefaultDescription}
                          onChange={(e) => handleFieldChange("seoDefaultDescription", e.target.value)}
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Palabras Clave (SEO Keywords)</label>
                        <input 
                          type="text" 
                          value={draft.seoDefaultKeywords}
                          onChange={(e) => handleFieldChange("seoDefaultKeywords", e.target.value)}
                          placeholder="pan, pasteleria, santiago"
                          className="w-full bg-[#0f0f0f] border border-white/10 p-3 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* GOOGLE SEARCH RESULTS PREVIEW (Premium mock) */}
                <div className="bg-[#0e0e0e] p-6 rounded-xl border border-white/5 flex flex-col justify-between h-full min-h-[380px]">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4 text-center">Previsualización de Indexación en Buscadores</span>
                    
                    <div className="bg-white p-6 rounded-lg shadow-xl space-y-2 border border-gray-200 select-none">
                      {/* Simulated Google snippet */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#202124] font-sans">
                          <span>https://www.panderey.cl</span>
                          <span className="text-[9px] text-gray-400">▼</span>
                        </div>
                        <h3 className="text-[#1a0dab] hover:underline text-base font-sans font-medium leading-tight cursor-pointer">
                          {draft.seoDefaultTitle || "Pan de Rey | Masa Madre"}
                        </h3>
                        <p className="text-[#4d5156] text-xs font-sans leading-relaxed pt-0.5 whitespace-normal break-words">
                          {draft.seoDefaultDescription || "Meta descripción de la tienda..."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161616] p-4 rounded border border-white/5 text-[10px] text-gray-400 space-y-1.5 mt-6 font-sans">
                    <p className="font-bold text-gray-300">💡 Importancia del SEO:</p>
                    <p>El título y descripción modificados aquí se inyectarán en la cabecera HTML principal de la tienda mediante metadatos para optimizar el rastreo en Google de forma automática.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action buttons footer */}
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
                  Guardar Cambios
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
