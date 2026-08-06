"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildCartItemKey, cartItemUnitPrice, type CartItem } from "./types";

const STORAGE_KEY = "pdr_cart_v1";

type CartContextValue = {
  items: CartItem[];
  // false hasta que se termina de leer localStorage — antes de eso `items`
  // siempre es [], y un consumidor que decida "carrito vacío -> redirigir"
  // sin chequear esto puede rebotar un carrito que en realidad tiene ítems
  // (el efecto de este componente que carga localStorage corre DESPUÉS del
  // de sus hijos, por el orden de commit de React).
  hydrated: boolean;
  addItem: (input: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  // El carrito es client-side por diseño (sección 07 del blueprint) — vive en
  // localStorage, no en la DB, hasta que se confirma el checkout. Se carga acá
  // (no en un lazy initializer de useState) a propósito: localStorage no
  // existe durante el render en el servidor, y leerlo en el initializer
  // produciría un mismatch de hidratación entre servidor y cliente.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage no disponible o con datos corruptos: arrancamos vacío.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = useCallback((input, quantity = 1) => {
    const key = buildCartItemKey(input.productId, input.options);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...input, key, quantity }];
    });
  }, []);

  const removeItem = useCallback(
    (key: string) => setItems((prev) => prev.filter((i) => i.key !== key)),
    [],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(key);
        return;
      }
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)));
    },
    [removeItem],
  );

  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + cartItemUnitPrice(i) * i.quantity, 0),
    [items],
  );
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      removeItem,
      setQuantity,
      clear,
      subtotal,
      itemCount,
      isOpen,
      openCart,
      closeCart,
    }),
    [items, hydrated, addItem, removeItem, setQuantity, clear, subtotal, itemCount, isOpen, openCart, closeCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
