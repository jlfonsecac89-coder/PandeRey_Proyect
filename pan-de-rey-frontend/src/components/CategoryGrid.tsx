import Link from 'next/link';
import Image from 'next/image';

const categories = [
  {
    name: 'Descuentos',
    slug: 'descuentos',
    image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80',
  },
  {
    name: 'Para Compartir',
    slug: 'para-compartir',
    image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80',
  },
  {
    name: 'Panadería',
    slug: 'panaderia',
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
  },
  {
    name: 'Pastelería',
    slug: 'pasteleria',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  },
  {
    name: 'Sin Gluten',
    slug: 'sin-gluten',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
  },
  {
    name: 'Cafetería',
    slug: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
  }
];

export default function CategoryGrid() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl text-foreground mb-4">Nuestras Especialidades</h2>
          <div className="w-24 h-1 bg-gold mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <Link 
              key={category.slug} 
              href={`/category/${category.slug}`}
              className="group relative h-80 overflow-hidden bg-charcoal-light rounded-sm"
            >
              <Image 
                src={category.image} 
                alt={category.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-40"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <h3 className="font-serif text-2xl text-white mb-2 tracking-wide group-hover:text-gold transition-colors duration-300">
                  {category.name}
                </h3>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium tracking-widest uppercase border-b border-gold pb-1 mt-4">
                  Explorar
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
