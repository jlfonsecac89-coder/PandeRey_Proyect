# Sistema de Diseño Premium: Pan de Rey (Rediseño 2026)

Este documento define las pautas visuales y estéticas para la nueva interfaz del e-commerce Pan de Rey. El objetivo es transmitir un posicionamiento exclusivo, artesanal y moderno, combinando una usabilidad mobile-first de clase mundial con un rendimiento óptimo de SEO y microinteracciones fluidas.

---

## 1. Identidad Visual & Paleta Cromática (Aesthetics)

Evitaremos colores genéricos o planos. Usaremos una paleta sofisticada basada en HSL que evoque los tonos cálidos del trigo, el dorado del horneado rústico y el contraste premium del carbón.

### Colores de Marca
*   **Dorado Primario (Trigo/Corteza)**: `#C5A880` (HSL 35°, 40%, 64%)
*   **Dorado Claro (Brillo/Resalte)**: `#E6CCA8` (HSL 35°, 55%, 78%)
*   **Dorado Oscuro (Contraste/Botones)**: `#A3835B` (HSL 33°, 29%, 50%)

### Colores de Soporte e Interfaz (Dark Mode Premium)
*   **Fondo Principal (Carbón Absoluto)**: `#0B0B0B` (HSL 0°, 0%, 4%)
*   **Fondo Secundario (Carbón Claro/Cards)**: `#161616` (HSL 0°, 0%, 9%)
*   **Bordes / Separadores**: `#252525` (HSL 0°, 0%, 15%)
*   **Texto Principal (Blanco Hueso)**: `#F5F5F5` (HSL 0°, 0%, 96%)
*   **Texto Secundario (Gris Muted)**: `#8F8F8F` (HSL 0°, 0%, 56%)

### Colores de Estado (WCAG Compatibles)
*   **Éxito / Entregado**: `#10B981` (Verde Esmeralda suave)
*   **Alerta / Incompleto / SLA Pausado**: `#F59E0B` (Ámbar)
*   **Error / SLA Excedido**: `#EF4444` (Rojo Coral)

---

## 2. Tipografía & Jerarquía Visual

Usaremos fuentes de Google Fonts cargadas de forma eficiente:
*   **Títulos principales & Marca**: `Playfair Display` (Serif tradicional, cursiva y elegante para denotar artesanía y herencia).
*   **Textos, Precios & Botones**: `Outfit` o `Inter` (Sans-serif moderno y geométrico para garantizar legibilidad en dispositivos móviles).

### Jerarquía
*   `h1`: `Playfair Display`, Cursiva, Tracking ancho.
*   `h2`, `h3`: `Playfair Display` o `Outfit` semibold.
*   `body`, `button`: `Outfit` regular/medium, tracking ajustado.

---

## 3. Principios de Layout (Bento Grid & Glassmorphism)

*   **Bento Grid**: Utilizaremos estructuras Bento Grid con tamaños asimétricos para la portada del sitio y la tienda, agrupando de forma visual y moderna las categorías (Panes, Pastelería, Bebidas, Ofertas) y los productos insignia del día.
*   **Efectos Glassmorphic**: En las tarjetas y overlays se usará `backdrop-blur-md` junto con fondos en `rgba(22, 22, 22, 0.7)` y bordes ultra delgados en `rgba(255, 255, 255, 0.08)` para dar profundidad y sofisticación visual.
*   **Microinteracciones**: 
    *   Hover en Cards: Transición suave de escala (`scale-[1.02]`), sombreado dorado difuso (`shadow-gold/10`) y brillo sutil de borde.
    *   Feedback de Carrito: El selector `[-] cantidad [+]` en color dorado resalta en la card del producto, evitando la fricción de entrar al detalle para compras rápidas.

---

## 4. Navegabilidad & Accesibilidad (CRO & Mobile-First)

*   **Thumb-Zone Design**: Los botones interactivos de añadir al carrito, desplegar el menú de filtros y finalizar la compra estarán concentrados en la zona de fácil alcance del pulgar en pantallas móviles.
*   **Filtros Inteligentes**: Barra de filtrado lateral colapsable por categorías y facetas (Ej: sin gluten, masa madre, ofertas, etc.) para que el usuario encuentre su producto favorito en menos de 3 clics.
*   **SLA Visible**: Los temporizadores operativos en el panel administrativo mantendrán un diseño limpio con cuenta regresiva en formato monoespaciado (`font-mono`) en colores semánticos (verde, amarillo, rojo).
