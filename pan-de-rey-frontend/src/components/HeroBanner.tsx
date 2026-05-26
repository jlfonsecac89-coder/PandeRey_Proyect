import Link from 'next/link';

export default function HeroBanner() {
  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20">
        <span className="text-gold uppercase tracking-[0.3em] text-sm font-semibold mb-6 block">
          Artesanal & Premium
        </span>
        <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
          El Arte del Buen <br/> <span className="text-gold italic font-light">Sabor</span>
        </h1>
        <p className="text-gray-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Descubre nuestra selección exclusiva de panes de masa madre, pastelería fina y especialidades para compartir. Cada pieza es elaborada con dedicación y los mejores ingredientes.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link 
            href="/shop" 
            className="px-8 py-4 bg-gold text-black font-semibold tracking-wide uppercase hover:bg-gold-hover transition-all transform hover:scale-105 duration-300"
          >
            TIENDA
          </Link>
          <Link 
            href="/#storytelling" 
            className="px-8 py-4 border border-gold text-gold font-semibold tracking-wide uppercase hover:bg-gold/10 transition-colors"
          >
            Nuestra Historia
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </div>
    </div>
  );
}
