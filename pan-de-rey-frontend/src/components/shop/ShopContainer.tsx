'use client';

import { useState, useEffect } from 'react';
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
  Users,
  Filter,
  Check
} from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import ProductDetail from './ProductDetail';
import CheckoutForm from './CheckoutForm';
import Navbar from '../Navbar';
import { formatPrice } from '@/utils/format';
import { getApiUrl } from '@/utils/api';

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
  { id: 1, name: 'Pan de Masa Madre Clásico', price: 4500, category: 'bakery', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80', description: 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas.', tags: ['masamadre'] },
  { id: 2, name: 'Focaccia al Romero', price: 3800, category: 'bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', tags: ['vegano'] },
  { id: 3, name: 'Baguette Tradicional', price: 1800, category: 'bakery', image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80', tags: ['vegano'] },
  { id: 4, name: 'Pan de Centeno Alemán', price: 4200, category: 'bakery', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges', tags: ['masamadre', 'vegano'] },
  { id: 5, name: 'Ciabatta Rústica', price: 2200, category: 'bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces', tags: ['vegano'] },

  // Pastelería
  { id: 6, name: 'Croissant de Mantequilla', price: 2200, category: 'pastry', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80', tags: [] },
  { id: 7, name: 'Pain au Chocolat', price: 2500, category: 'pastry', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1', tags: [] },
  { id: 8, name: 'Tarta de Limón y Merengue', price: 3800, category: 'pastry', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80', tags: [] },
  { id: 9, name: 'Roll de Canela Glaseado', price: 2800, category: 'pastry', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2', tags: [] },

  // Sin Gluten
  { id: 10, name: 'Brownie Sin Gluten', price: 2500, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', tags: ['singluten'] },
  { id: 11, name: 'Pan de Molde Keto', price: 5500, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1', tags: ['singluten'] },
  { id: 12, name: 'Galletas de Almendra', price: 1800, category: 'gluten-free', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1', tags: ['singluten'] },

  // Bebestibles
  { id: 13, name: 'Café Latte XL', price: 3500, category: 'drinks', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80', tags: [] },
  { id: 14, name: 'Espresso Doble', price: 2200, category: 'drinks', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80', tags: [] },
  { id: 15, name: 'Cappuccino Italiano', price: 3200, category: 'drinks', image: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80', tags: [] },
  { id: 16, name: 'Té Matcha Orgánico', price: 3800, category: 'drinks', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80&hue=1', tags: [] },

  // Ofertas y Compartir
  { id: 17, name: 'Combo 2x1 Baguette', price: 3200, category: 'offers', image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80&bri=-1', tags: ['vegano'] },
  { id: 18, name: 'Desayuno Promocional', price: 5500, category: 'offers', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80', tags: [] },
  { id: 19, name: 'Pack Familiar Brunch', price: 15000, category: 'share', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80&sat=-1', tags: [] },
  { id: 20, name: 'Caja Selección Dulce', price: 12000, category: 'share', image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=-1', tags: [] },
];

export default function ShopContainer() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Filtros adicionales
  const [priceRange, setPriceRange] = useState<number>(15000);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('default');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [products, setProducts] = useState<any[]>(mockProducts);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(getApiUrl('/api/catalog/products'));
        if (res.ok) {
          const dbProducts = await res.json();
          if (Array.isArray(dbProducts) && dbProducts.length > 0) {
            setProducts(dbProducts);
          }
        }
      } catch (err) {
        console.error('Failed to load products from database:', err);
      }
    };
    loadProducts();
  }, []);

  const { addToCart, setIsCartOpen, items, updateQuantity } = useCart();

  const handleDecrementProduct = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const cartItem = items.find(item => item.productId === productId);
    if (cartItem) {
      updateQuantity(cartItem.id, cartItem.quantity - 1);
    }
  };

  const handleIncrementProduct = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    const cartItem = items.find(item => item.productId === product.id.toString());
    if (cartItem) {
      updateQuantity(cartItem.id, cartItem.quantity + 1);
    } else {
      addToCart({
        productId: product.id.toString(),
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.image
      });
    }
  };

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

  const filteredProducts = products
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .filter(p => p.price <= priceRange)
    .filter(p => {
      if (selectedTags.length === 0) return true;
      return selectedTags.every(tag => p.tags?.includes(tag));
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#0F0F0F] via-[#0B0B0B] to-[#080808] text-white">
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
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-12 scrollbar-hide [mask-image:linear-gradient(to_right,white_90%,transparent_100%)] pr-8">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                      }}
                      className={`flex items-center gap-3 whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 cursor-pointer ${
                        activeCategory === cat.id 
                          ? 'bg-gold text-black shadow-[0_4px_20px_rgba(212,175,55,0.25)]' 
                          : 'bg-charcoal-light/40 text-foreground/60 hover:text-foreground hover:bg-charcoal-light/80 border border-white/5'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Filter & Sort Bar */}
            <div className="flex md:hidden gap-3 mb-8">
              <button 
                onClick={() => setIsFilterDrawerOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-charcoal-light/40 border border-white/5 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white hover:border-gold/30 active:scale-95 transition-all cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-gold" />
                Filtrar
                {selectedTags.length > 0 && ` (${selectedTags.length})`}
              </button>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-charcoal-light/40 border border-white/5 px-4 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white outline-none focus:border-gold/30 appearance-none text-center"
              >
                <option value="default">Ordenar</option>
                <option value="price-asc">Precio: Bajo a Alto</option>
                <option value="price-desc">Precio: Alto a Bajo</option>
                <option value="name-asc">Nombre: A-Z</option>
              </select>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Desktop Sidebar Filter */}
              <aside className="hidden md:block w-64 shrink-0 bg-charcoal-light/25 border border-white/5 rounded-2xl p-6 sticky top-24 backdrop-blur-sm">
                <div className="space-y-8">
                  {/* Sorting */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 block mb-3">Ordenar por</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-[#0b0b0b] border border-white/10 px-4 py-3 rounded-lg text-xs text-white outline-none focus:border-gold transition-colors appearance-none"
                    >
                      <option value="default">Predeterminado</option>
                      <option value="price-asc">Precio: Menor a Mayor</option>
                      <option value="price-desc">Precio: Mayor a Menor</option>
                      <option value="name-asc">Nombre: A-Z</option>
                    </select>
                  </div>

                  {/* Price Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">Precio Máximo</label>
                      <span className="text-xs text-gold font-bold font-serif">${formatPrice(priceRange)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1000" 
                      max="15000" 
                      step="500"
                      value={priceRange}
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-serif">
                      <span>$1.000</span>
                      <span>$15.000</span>
                    </div>
                  </div>

                  {/* Dietary Preferences Checkboxes */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 block mb-4">Preferencias</label>
                    <div className="space-y-3">
                      {[
                        { id: 'masamadre', name: 'Masa Madre' },
                        { id: 'singluten', name: 'Sin Gluten' },
                        { id: 'vegano', name: 'Vegano' }
                      ].map((tag) => {
                        const isChecked = selectedTags.includes(tag.id);
                        return (
                          <label key={tag.id} className="flex items-center gap-3 cursor-pointer group select-none">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedTags(selectedTags.filter(t => t !== tag.id));
                                } else {
                                  setSelectedTags([...selectedTags, tag.id]);
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${isChecked ? 'border-gold bg-gold' : 'border-white/20 bg-[#0b0b0b] group-hover:border-white/40'}`}>
                              {isChecked && <Check className="w-3 h-3 text-black stroke-[3]" />}
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{tag.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {(priceRange < 15000 || selectedTags.length > 0 || sortBy !== 'default') && (
                    <button 
                      onClick={() => {
                        setPriceRange(15000);
                        setSelectedTags([]);
                        setSortBy('default');
                      }}
                      className="w-full text-center text-xs font-bold text-red-400 hover:text-red-300 transition-colors pt-4 border-t border-white/5 cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </aside>

              {/* Product Grid Column */}
              <div className="flex-1 w-full">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 border border-dashed border-white/5 rounded-2xl bg-charcoal-light/10">
                    <p className="text-sm uppercase tracking-widest mb-3 font-bold text-white/40">No se encontraron productos</p>
                    <p className="text-xs text-gray-600">Intenta ajustando los filtros laterales o la categoría</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                      const cartQty = items
                        .filter(item => item.productId === product.id.toString())
                        .reduce((sum, item) => sum + item.quantity, 0);

                      return (
                        <div 
                          key={product.id} 
                          onClick={() => setSelectedProduct(product)}
                          className="group cursor-pointer flex flex-col relative bg-charcoal-light/40 border border-white/5 rounded-2xl p-4 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(212,175,55,0.06)] hover:border-gold/25 transition-all duration-300 backdrop-blur-sm"
                        >
                          <div className="relative aspect-square w-full mb-5 rounded-xl overflow-hidden bg-white/5">
                            <Image 
                              src={product.image} 
                              alt={product.name} 
                              fill 
                              className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
                            />
                            {cartQty > 0 && (
                              <div className="absolute top-4 right-4 bg-gold text-black font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-black/10 z-10 animate-in zoom-in-50 duration-300">
                                {cartQty}
                              </div>
                            )}
                            {cartQty > 0 ? (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-4 right-4 h-9 bg-gold text-black rounded-lg flex items-center shadow-xl opacity-100 transition-all duration-300 z-20 border border-black/10 overflow-hidden"
                              >
                                <button 
                                  onClick={(e) => handleDecrementProduct(e, product.id.toString())}
                                  className="w-7 h-full flex items-center justify-center hover:bg-black/10 active:scale-95 transition-all text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="px-1 font-bold text-xs min-w-[18px] text-center select-none">{cartQty}</span>
                                <button 
                                  onClick={(e) => handleIncrementProduct(e, product)}
                                  className="w-7 h-full flex items-center justify-center hover:bg-black/10 active:scale-95 transition-all text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => handleAddToCart(e, product)}
                                className="absolute bottom-4 right-4 w-9 h-9 bg-gold text-black rounded-lg flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-gold-hover active:scale-95 shadow-xl z-20"
                              >
                                <Plus className="w-4.5 h-4.5" />
                              </button>
                            )}
                          </div>
                          <div className="space-y-2 flex-grow flex flex-col justify-between">
                            <h3 className="text-base font-serif text-white group-hover:text-gold transition-colors line-clamp-2 leading-tight">{product.name}</h3>
                            <div className="flex justify-between items-center">
                              <p className="text-gold font-serif text-base font-semibold">${formatPrice(product.price)}</p>
                              {product.tags && product.tags.length > 0 && (
                                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                  {product.tags[0] === 'masamadre' ? 'Masa Madre' : product.tags[0] === 'singluten' ? 'Sin Gluten' : 'Vegano'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Filter Drawer */}
      {isFilterDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[150] transition-opacity duration-300"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-[#0B0B0B] border-r border-white/10 z-[151] p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                <h3 className="font-serif text-lg text-white">Filtros</h3>
                <button 
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Price Slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">Precio Máximo</label>
                    <span className="text-xs text-gold font-bold font-serif">${formatPrice(priceRange)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="15000" 
                    step="500"
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-serif">
                    <span>$1.000</span>
                    <span>$15.000</span>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 block mb-4">Preferencias</label>
                  <div className="space-y-4">
                    {[
                      { id: 'masamadre', name: 'Masa Madre' },
                      { id: 'singluten', name: 'Sin Gluten' },
                      { id: 'vegano', name: 'Vegano' }
                    ].map((tag) => {
                      const isChecked = selectedTags.includes(tag.id);
                      return (
                        <label key={tag.id} className="flex items-center gap-3 cursor-pointer group select-none">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedTags(selectedTags.filter(t => t !== tag.id));
                              } else {
                                setSelectedTags([...selectedTags, tag.id]);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${isChecked ? 'border-gold bg-gold' : 'border-white/20 bg-[#0b0b0b]'}`}>
                            {isChecked && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                          </div>
                          <span className="text-sm text-gray-300">{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-white/5">
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full bg-gold text-black py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gold-hover transition-colors cursor-pointer"
              >
                Ver {filteredProducts.length} Productos
              </button>
              
              {(priceRange < 15000 || selectedTags.length > 0 || sortBy !== 'default') && (
                <button 
                  onClick={() => {
                    setPriceRange(15000);
                    setSelectedTags([]);
                    setSortBy('default');
                  }}
                  className="w-full text-center py-2 text-xs font-bold text-red-400 uppercase tracking-widest cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Checkout Overlay */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-500">
          <div className="bg-[#0B0B0B] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <div className="sticky top-0 z-10 bg-[#0B0B0B]/90 backdrop-blur-md p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-white font-serif text-2xl tracking-wide">Finalizar Pedido</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer">
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
