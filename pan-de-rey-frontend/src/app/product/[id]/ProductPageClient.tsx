"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { getApiUrl } from '@/utils/api';

// MOCK DATA for MVP UI Demonstration
const mockProduct = {
  id: 'prod-123',
  name: 'Pan de Masa Madre Clásico',
  description: 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas para asegurar una corteza crujiente y una miga alveolada y suave.',
  basePrice: 12.00,
  imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  variants: [
    { id: 'var-1', name: 'Clásico', priceAdjustment: 0, isAvailable: true },
    { id: 'var-2', name: 'Con Semillas', priceAdjustment: 2.00, isAvailable: true },
    { id: 'var-3', name: 'Nuez y Pasas', priceAdjustment: 3.50, isAvailable: false },
  ]
};

export default function ProductPageClient({ params }: { params: { id: string } }) {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(mockProduct);
  const [selectedVariant, setSelectedVariant] = useState<any>(mockProduct.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/catalog/products/${params.id}`));
        if (res.ok) {
          const dbProduct = await res.json();
          if (dbProduct && dbProduct.id) {
            const mappedProduct = {
              id: dbProduct.id,
              name: dbProduct.name,
              description: dbProduct.description,
              basePrice: parseFloat(dbProduct.base_price),
              imageUrl: dbProduct.image_url,
              variants: dbProduct.variants ? dbProduct.variants.map((v: any) => ({
                id: v.id,
                name: v.variant_name,
                priceAdjustment: parseFloat(v.price_adjustment),
                isAvailable: parseInt(v.quantity) > 0
              })) : []
            };
            setProduct(mappedProduct);
            if (mappedProduct.variants.length > 0) {
              setSelectedVariant(mappedProduct.variants[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load product from database:', err);
      }
    };
    loadProduct();
  }, [params.id]);

  const currentPrice = product.basePrice + (selectedVariant ? selectedVariant.priceAdjustment : 0);

  const handleAddToCart = async () => {
    setIsAdding(true);
    const success = await addToCart({
      productId: product.id,
      name: product.name,
      filling: selectedVariant ? selectedVariant.name : undefined,
      price: currentPrice,
      quantity,
      imageUrl: product.imageUrl
    });
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Product Image */}
          <div className="relative aspect-square w-full rounded-sm overflow-hidden border border-charcoal-border">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{product.name}</h1>
            <p className="text-2xl font-medium text-gold mb-6">${currentPrice.toFixed(2)}</p>
            
            <p className="text-gray-400 font-light leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-gray-300 mb-4">Variedad</h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.variants.map((variant: any) => (
                    <button
                      key={variant.id}
                      disabled={!variant.isAvailable}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-3 border text-sm text-center transition-all ${
                        !variant.isAvailable 
                          ? 'border-gray-800 text-gray-600 cursor-not-allowed bg-charcoal-light/30' 
                          : selectedVariant && selectedVariant.id === variant.id
                            ? 'border-gold text-gold bg-gold/10'
                            : 'border-charcoal-border text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {variant.name} 
                      {!variant.isAvailable && ' (Agotado)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex gap-4 items-end mt-auto">
              <div className="w-1/3">
                <h3 className="text-sm uppercase tracking-widest text-gray-300 mb-4">Cantidad</h3>
                <div className="flex items-center border border-charcoal-border rounded-sm h-14">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex-1 text-gray-400 hover:text-white">-</button>
                  <span className="flex-1 text-center font-medium text-white">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="flex-1 text-gray-400 hover:text-white">+</button>
                </div>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={(selectedVariant && !selectedVariant.isAvailable) || isAdding}
                className={`w-2/3 h-14 font-semibold uppercase tracking-widest transition-colors ${
                  selectedVariant && !selectedVariant.isAvailable 
                    ? 'bg-charcoal-light text-gray-500 cursor-not-allowed'
                    : 'bg-gold text-black hover:bg-gold-hover'
                }`}
              >
                {isAdding ? 'Añadiendo...' : 'Añadir al Carrito'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
