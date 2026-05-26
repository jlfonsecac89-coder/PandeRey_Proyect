'use client';

import { useState } from 'react';
import { ChevronRight, Plus, Minus, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface ProductDetailProps {
  product?: {
    id: string | number;
    name: string;
    price: number;
    description?: string;
    image?: string;
    category?: string;
  };
  onClose?: () => void;
}

export default function ProductDetail({ product, onClose }: ProductDetailProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [variety, setVariety] = useState('Clásico');

  if (!product) return null;

  const handleAddToCart = async () => {
    await addToCart({
      productId: product.id.toString(),
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image || '',
      filling: variety,
    });
    if (onClose) onClose();
  };

  return (
    <div className="w-full text-white flex flex-col lg:flex-row gap-12">
      {/* Left Side: Large Image */}
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-[600px] relative rounded-lg overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-8 left-8 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all border border-white/10 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Right Side: Info */}
      <div className="w-full lg:w-1/2 lg:p-12 flex flex-col justify-center space-y-10">
        <div>
          <h1 className="font-serif text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
            {product.name}
          </h1>
          <p className="text-3xl font-light text-gold font-serif">
            ${product.price.toLocaleString()}
          </p>
        </div>

        <p className="text-gray-400 text-lg font-light leading-relaxed max-w-xl">
          {product.description || 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas para asegurar una corteza crujiente y una miga alveolada y suave.'}
        </p>

        {/* Variedad Section */}
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Variedad</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl">
            {['Clásico', 'Con Semillas', 'Nuez y Pasas (Agotado)'].map((v) => (
              <button 
                key={v}
                onClick={() => setVariety(v)}
                className={`px-4 py-4 border text-xs uppercase tracking-widest transition-all ${
                  variety === v 
                    ? 'border-gold text-white bg-gold/5' 
                    : 'border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity & Add to Cart */}
        <div className="space-y-4 pt-6">
          <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Cantidad</label>
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            {variety.includes('Agotado') ? (
              <button 
                onClick={() => {
                  const email = prompt("Introduce tu correo electrónico para avisarte cuando esté disponible:");
                  if (email) {
                    alert(`¡Gracias! Te avisaremos a ${email} en cuanto tengamos stock de ${product.name} (${variety.replace(' (Agotado)', '')}).`);
                  }
                }}
                className="flex-1 bg-charcoal-light border border-gold text-gold py-4 font-bold uppercase tracking-[0.2em] text-xs hover:bg-gold/10 transition-all rounded-sm"
              >
                Avísame cuando esté disponible
              </button>
            ) : (
              <>
                <div className="flex items-center border border-white/10 bg-black/40 p-1 rounded-sm w-32">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-12 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="flex-1 text-center font-serif font-bold text-xl">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-12 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 bg-gold text-black py-4 font-bold uppercase tracking-[0.2em] text-xs hover:bg-gold-hover transition-all shadow-2xl shadow-gold/10"
                >
                  Añadir al Carrito
                </button>
              </>
            )}
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="hidden lg:flex items-center text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.3em] pt-12"
          >
            <X className="w-4 h-4 mr-2" /> Volver a la Tienda
          </button>
        )}
      </div>
    </div>
  );
}
