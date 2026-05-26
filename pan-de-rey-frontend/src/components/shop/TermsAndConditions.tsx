'use client';

import { X } from 'lucide-react';

interface TermsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsAndConditions({ isOpen, onClose }: TermsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] w-full max-w-3xl max-h-[85vh] rounded-lg border border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h1 className="text-xl md:text-2xl font-serif text-white tracking-wide">
            Términos, Condiciones y Políticas de Privacidad
          </h1>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
            aria-label="Cerrar términos"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-8 text-gray-300 font-sans leading-relaxed text-sm md:text-base">
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3 tracking-wide">1. Identificación de la Empresa</h2>
            <p>
              El presente documento regula el uso de los servicios prestados en la plataforma digital de <strong>PAN DE REY SPA</strong>, RUT <strong>12.345.678-9</strong>, con domicilio físico en <strong>San Diego 699 · Stgo</strong>. 
              Al registrarse y utilizar nuestros servicios, el usuario acepta de manera expresa, libre e inequívoca las políticas descritas a continuación, conforme a lo establecido en la Ley N° 19.628 sobre Protección de la Vida Privada (Legislación Chilena).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 tracking-wide">2. Recopilación de Datos Personales</h2>
            <p>
              Para poder ofrecer una experiencia de compra personalizada y procesar adecuadamente los pedidos, recopilamos información personal durante el proceso de registro y checkout. Esto incluye de forma estricta: nombre completo, correo electrónico, fecha de nacimiento, número de teléfono (opcional) y RUT (opcional, para fines de facturación). 
              Esta información es provista voluntariamente por el usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 tracking-wide">3. Uso de Datos (Marketing y Análisis)</h2>
            <p>
              Los datos recopilados serán utilizados exclusivamente con las siguientes finalidades:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Gestión, procesamiento y despacho de compras realizadas en la plataforma.</li>
              <li>Envío de comunicaciones transaccionales (confirmaciones de pedido, boletas, estado de entrega).</li>
              <li>Fines de análisis estadístico interno para mejorar nuestra oferta de productos y usabilidad del sitio.</li>
              <li>Envío de comunicaciones de marketing, promociones y ofertas especiales (solo si el usuario no ha optado por darse de baja de dichas comunicaciones).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 tracking-wide">4. No Compartición con Terceros</h2>
            <p>
              <strong>PAN DE REY SPA</strong> garantiza la más estricta confidencialidad de la información aportada. 
              Nos comprometemos a <strong>NO comercializar, ceder, ni transferir</strong> sus datos personales a terceros bajo ninguna circunstancia, salvo que exista una obligación legal o una orden judicial que así lo exija, o bien, cuando sea estrictamente necesario para el cumplimiento de la prestación logística (ej. entrega a través de repartidores propios).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 tracking-wide">5. Seguridad de la Información</h2>
            <p>
              Implementamos rigurosas medidas de seguridad técnicas, físicas y administrativas para salvaguardar sus datos personales contra acceso, alteración, divulgación o destrucción no autorizada. 
              Todas las transacciones de pago se procesan a través de pasarelas cifradas y seguras, no almacenando nuestra plataforma datos sensibles de tarjetas de crédito o débito.
            </p>
          </section>

          <section className="bg-white/5 p-4 rounded-md border border-white/10 mt-8">
            <h2 className="text-md font-bold text-gold mb-2 uppercase tracking-wider text-sm">Derechos ARCO y Contacto</h2>
            <p className="text-gray-200">
              Usted tiene derecho a acceder, rectificar, cancelar u oponerse (Derechos ARCO) al tratamiento de sus datos personales. 
              <br/><br/>
              <strong>Cualquier solicitud respecto a tus datos personales debe ser enviada a contacto@panderey.cl y será procesada en un plazo máximo de 5 días hábiles.</strong>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 shrink-0 bg-[#0a0a0a] rounded-b-lg flex justify-end">
          <button 
            onClick={onClose}
            className="bg-gold hover:bg-gold-hover text-black px-8 py-3 rounded-md font-bold uppercase tracking-widest text-xs transition-colors"
          >
            Entendido y Acepto
          </button>
        </div>

      </div>
    </div>
  );
}
