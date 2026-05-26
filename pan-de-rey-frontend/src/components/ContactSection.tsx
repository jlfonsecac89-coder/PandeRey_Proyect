export default function ContactSection() {
  return (
    <section id="contact" className="py-24 bg-charcoal-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h2 className="font-serif text-4xl text-white">Visítanos o Escríbenos</h2>
            <div className="w-20 h-1 bg-gold"></div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="mt-1 text-gold">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Ubicación</h3>
                  <p className="text-gray-400">Av. Principal 1234, Providencia<br/>Santiago, Chile</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="mt-1 text-gold">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Horario</h3>
                  <p className="text-gray-400">Lun - Vie: 08:00 - 20:00<br/>Sáb - Dom: 09:00 - 19:00</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="mt-1 text-gold">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Contacto</h3>
                  <p className="text-gray-400">hola@panderey.cl<br/>+56 9 1234 5678</p>
                </div>
              </div>
            </div>
            
            {/* Simple Map Placeholder */}
            <div className="h-64 bg-background rounded-sm border border-charcoal-border flex items-center justify-center grayscale">
              <span className="text-gold tracking-widest text-sm uppercase">Mapa Interactivo</span>
            </div>
          </div>
          
          <div className="bg-background p-8 md:p-12 border border-charcoal-border rounded-sm">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Nombre</label>
                  <input type="text" className="w-full bg-charcoal-light border border-charcoal-border p-4 text-white focus:border-gold outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Email</label>
                  <input type="email" className="w-full bg-charcoal-light border border-charcoal-border p-4 text-white focus:border-gold outline-none transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Asunto</label>
                <input type="text" className="w-full bg-charcoal-light border border-charcoal-border p-4 text-white focus:border-gold outline-none transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Mensaje</label>
                <textarea rows={5} className="w-full bg-charcoal-light border border-charcoal-border p-4 text-white focus:border-gold outline-none transition-colors resize-none"></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-gold text-black font-semibold uppercase tracking-widest hover:bg-gold-hover transition-colors">
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
