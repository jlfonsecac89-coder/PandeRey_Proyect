"use client";

import { Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Configuración e Integraciones</h1>
        <p className="text-gray-400">Administra las variables del sistema y conexiones externas.</p>
      </div>

      <div className="bg-charcoal-light p-8 rounded-sm border border-charcoal-border space-y-8">
        
        {/* WhatsApp Config */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Integración WhatsApp (Ventas Asistidas)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Número de WhatsApp (con código de país)</label>
              <input 
                type="text" 
                defaultValue="5491112345678"
                className="w-full bg-background border border-charcoal-border rounded-sm p-3 text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Mensaje Predefinido para Checkout Asistido</label>
              <textarea 
                rows={3}
                defaultValue="Hola Pan de Rey! Quisiera confirmar mi pedido..."
                className="w-full bg-background border border-charcoal-border rounded-sm p-3 text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-charcoal-border w-full"></div>

        {/* Webhooks n8n Config */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Orquestación (Webhooks n8n)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Endpoint Webhook (Nuevo Pedido)</label>
              <input 
                type="text" 
                placeholder="https://n8n.tudominio.com/webhook/nuevo-pedido"
                className="w-full bg-background border border-charcoal-border rounded-sm p-3 text-white focus:outline-none focus:border-gold"
              />
              <p className="text-xs text-gray-500 mt-2">Este endpoint se disparará cuando un pedido pase a estado "Pagado".</p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button className="flex items-center gap-2 bg-gold text-black px-6 py-3 font-medium rounded-sm hover:bg-gold-hover transition-colors">
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
}
