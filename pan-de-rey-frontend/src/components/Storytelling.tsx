import Image from 'next/image';

export default function Storytelling() {
  return (
    <section id="storytelling" className="py-24 bg-charcoal-light relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-[600px] rounded-sm overflow-hidden group">
            <Image 
              src="/storefront.jpg"
              alt="Pan de Rey Local"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 border-[12px] border-gold/20 m-6"></div>
          </div>
          
          <div className="space-y-8">
            <span className="text-gold uppercase tracking-[0.3em] text-sm font-semibold">
              Nuestra Historia
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight">
              Tradición familiar, <br/>
              <span className="italic text-gold font-light">pasión por el detalle</span>
            </h2>
            <div className="w-20 h-1 bg-gold"></div>
            
            <div className="space-y-6 text-gray-400 text-lg leading-relaxed font-light">
              <p>
                En Pan de Rey, creemos que el pan es más que alimento; es un vínculo con nuestras raíces. Cada mañana, nuestro horno cobra vida para transformar ingredientes nobles en piezas únicas de arte comestible.
              </p>
              <p>
                Nuestra masa madre, cultivada con paciencia y cuidado, otorga a cada pan una textura y sabor inigualables, respetando los tiempos naturales de fermentación para una digestión más ligera y nutritiva.
              </p>
              <p>
                Desde el crujiente de nuestras baguettes hasta la delicadeza de nuestra pastelería francesa, cada producto cuenta una historia de dedicación y excelencia.
              </p>
            </div>
            
            <div className="pt-8 grid grid-cols-2 gap-8">
              <div>
                <span className="block text-3xl font-serif text-gold mb-2">100%</span>
                <span className="text-sm uppercase tracking-widest text-gray-500">Artesanal</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-gold mb-2">+48h</span>
                <span className="text-sm uppercase tracking-widest text-gray-500">Fermentación</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
    </section>
  );
}
