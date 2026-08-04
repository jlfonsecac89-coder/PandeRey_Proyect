"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartContext";

export function ClearCartOnSuccess() {
  const { clear, hydrated } = useCart();

  // Hay que esperar a `hydrated`: el efecto de CartProvider que carga
  // localStorage corre DESPUÉS del de este componente hijo (orden de commit
  // de React), así que limpiar antes de eso se pisa con el carrito viejo
  // recién cargado.
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);

  return null;
}
