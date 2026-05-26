'use client';

import { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  User, 
  X,
  Zap,
  Utensils,
  Coffee,
  Info,
  Users
} from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import ProductDetail from './ProductDetail';
import CheckoutForm from './CheckoutForm';
import Navbar from '../Navbar';

const categories = [
  { id: 'all', name: 'Todo', icon: Utensils },
  { id: 'offers', name: 'Ofertas', icon: Zap },
  { id: 'bakery', name: 'Panadería', icon: Utensils },
  { id: 'pastry', name: 'Pastelería', icon: Coffee },
  { id: 'gluten-free', name: 'Sin Gluten', icon: Info },
  { id: 'drinks', name: 'Bebestibles', icon: Coffee },
];

const mockProducts = [
  // Panadería
  { id: 1, name: 'Pan de Masa Madre Clásico', price: 4500, category: 'bakery', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80', description: 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas.' },
  { id: 2, name: 'Focaccia al Romero', price: 3800, category: 'bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80' },
  { id: 3, name: 'Baguette Tradicional', price: 1800, category: 'bakery', image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80' },
  { id: 4, name: 'Pan de Centeno Alemán', price: 4200, category: 'bakery', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges' },
  { id: 5, name: 'Ciabatta Rústica', price: 2200, category: 'bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces' },

  // Pastelería
  { id: 6, name: 'Croissant de Mantequilla', price: 2200, category: 'pastry', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80' },
  { id: 7, name: 'Pain au Chocolat', price: 2500, category: 'pastry', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1' },
  { id: 8, name: 'Tarta de Limón y Merengue', price: 3800, category: 'pastry', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80' },
  { id: 9, name: 'Roll de Canela Glaseado', price: 2800, category: 'pastry', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2' },

  // Sin Gluten
  { id: 10, name: 'Brownie Sin Gluten', price: 2500, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80' },
  { id: 11, name: 'Pan de Molde Keto', price: 5500, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1' },
  { id: 12, name: 'Galletas de Almendra', price: 1800, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1' },

  // Bebestibles
  { id: 13, name: 'Café Latte XL', price: 3500, category: 'drinks', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80' },
  { id: 14, name: 'Espresso Doble', price: 2200, category: 'drinks', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80' },
  { id: 15, name: 'Cappuccino Italiano', price: 3200, category: 'drinks', image: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80' },
  { id: 16, name: 'Té Matcha Orgánico', price: 3800, category: 'drinks', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80&hue=1' },

  // Ofertas y Compartir
  { id: 17, name: 'Combo 2x1 Baguette', price: 3200, category: 'offers', image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80&bri=-1' },
  { id: 18, name: 'Desayuno Promocional', price: 5500, category: 'offers', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80' },
  { id: 19, name: 'Pack Familiar Brunch', price: 15000, category: 'share', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80&sat=-1' },
  { id: 20, name: 'Caja Selección Dulce', price: 12000, category: 'share', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=-1' },
];

export default function ShopContainer() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { addToCart, setIsCartOpen, items } = useCart();

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    addToCart({
      productId: product.id.toString(),
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image
    });
  };

  const filteredProducts = mockProducts.filter(p => activeCategory === 'all' || p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-20 px-8 max-w-[1400px] mx-auto">
        
        {selectedProduct ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Horizontal Category Filter */}
            <div className="flex gap-4 overflow-x-auto pb-12 scrollbar-hide">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-3 whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                      activeCategory === cat.id 
                        ? 'bg-gold text-black' 
                        : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {/* Adjusted icon size */}
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => setSelectedProduct(product)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-square w-full mb-6 rounded-sm overflow-hidden bg-white/5">
                    <Image 
                      src={product.image} 
                      alt={product.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
                    />
                    <button 
                      onClick={(e) => handleAddToCart(e, product)}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-gold text-black rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gold-hover shadow-xl"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif text-white group-hover:text-gold transition-colors">{product.name}</h3>
                    <p className="text-gold font-serif">${product.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Checkout Overlay */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-500">
          <div className="bg-[#0B0B0B] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm border border-gold/30 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <div className="sticky top-0 z-10 bg-[#0B0B0B] p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-serif text-2xl">Finalizar Pedido</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <CheckoutForm onComplete={() => {
                alert('¡Pedido realizado con éxito!');
                setIsCheckoutOpen(false);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
