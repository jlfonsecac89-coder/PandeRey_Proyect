import Link from 'next/link';
import Image from 'next/image';

const categories = [
  {
    name: 'Panadería',
    slug: 'panaderia',
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=1000&q=80',
    gridClass: 'md:col-span-2 md:row-span-2 h-[28rem] md:h-auto',
    tagline: 'Masa madre, fermentación lenta y tradición horneada diariamente.',
    label: 'Clásico de la casa'
  },
  {
    name: 'Para Compartir',
    slug: 'para-compartir',
    image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80',
    gridClass: 'md:col-span-1 md:row-span-2 h-[28rem] md:h-auto',
    tagline: 'Brunch y picoteos gourmet diseñados para disfrutar en compañía.',
    label: 'Momentos'
  },
  {
    name: 'Descuentos',
    slug: 'descuentos',
    image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80',
    gridClass: 'md:col-span-2 md:row-span-1 h-60 md:h-[16rem]',
    tagline: 'Beneficios y promociones exclusivas en tus piezas favoritas.',
    label: 'Promociones'
  },
  {
    name: 'Pastelería',
    slug: 'pasteleria',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    gridClass: 'md:col-span-1 md:row-span-1 h-60 md:h-[16rem]',
    tagline: 'Alta repostería y bocados dulces de autor.',
    label: 'Patisserie'
  },
  {
    name: 'Sin Gluten',
    slug: 'sin-gluten',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    gridClass: 'md:col-span-1 md:row-span-1 h-60 md:h-[16rem]',
    tagline: 'Sabor y textura insuperable, 100% libres de gluten.',
    label: 'Especiales'
  },
  {
    name: 'Cafetería',
    slug: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
    gridClass: 'md:col-span-2 md:row-span-1 h-60 md:h-[16rem]',
    tagline: 'Granos de origen seleccionados e infusiones de alta gama.',
    label: 'Boutique'
  }
];

export default function CategoryGrid() {
  return (
    <section className="py-24 bg-background border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-gold font-sans text-xs font-semibold tracking-[0.25em] uppercase">Nuestra Selección</span>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mt-3 mb-4 tracking-wide">Nuestras Especialidades</h2>
          <div className="w-16 h-[2px] bg-gold mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[16rem]">
          {categories.map((category) => (
            <Link 
              key={category.slug} 
              href={`/category/${category.slug}`}
              className={`group relative overflow-hidden bg-charcoal-light rounded-2xl border border-white/5 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_12px_40px_rgba(212,175,55,0.08)] ${category.gridClass}`}
            >
              <Image 
                src={category.image} 
                alt={category.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 p-6 flex flex-col justify-end z-10">
                <span className="text-gold font-sans text-[10px] font-bold tracking-[0.2em] uppercase mb-1 opacity-80">
                  {category.label}
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-1 group-hover:text-gold transition-colors duration-300">
                  {category.name}
                </h3>
                <p className="text-foreground/60 font-sans text-xs md:text-sm max-w-md line-clamp-2 opacity-80 group-hover:text-foreground/80 group-hover:opacity-100 transition-all duration-300">
                  {category.tagline}
                </p>
                <div className="mt-4 flex items-center gap-2 text-gold text-xs font-medium tracking-[0.15em] uppercase opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <span>Descubrir</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
