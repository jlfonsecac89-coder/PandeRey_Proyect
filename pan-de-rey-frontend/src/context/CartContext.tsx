"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  filling?: string;
  topping?: string;
  dietaryType?: string; // e.g., 'Con Gluten', 'Sin Gluten'
};

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<boolean>;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // MOCK: In a real app we load from localStorage and validate with API
  useEffect(() => {
    const saved = localStorage.getItem('pan_de_rey_cart');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pan_de_rey_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = async (newItem: Omit<CartItem, 'id'>) => {
    try {
      // Simulate API call to Backend to reserve stock for 10 minutes
      // const res = await fetch('http://localhost:3001/api/cart/reserve', { ... })
      // if (!res.ok) throw new Error("Agotado")

      const id = `${newItem.productId}-${newItem.filling || ''}-${newItem.topping || ''}-${newItem.dietaryType || ''}`;
      
      setItems(prev => {
        const existing = prev.find(item => item.id === id);
        if (existing) {
          return prev.map(item => 
            item.id === id ? { ...item, quantity: item.quantity + newItem.quantity } : item
          );
        }
        return [...prev, { ...newItem, id }];
      });
      
      setIsCartOpen(true);
      return true;
    } catch (error) {
      alert("No hay stock suficiente.");
      return false;
    }
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(id);
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, total, isCartOpen, setIsCartOpen, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
