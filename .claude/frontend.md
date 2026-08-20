# 🎨 Reglas de Frontend (Next.js 16 + React 19 + Tailwind v4)

## 🧱 Sistema de Componentes y UI Base
- **Primitivos (UI Base):** Viven en `src/components/ui/` (ej. `button.tsx`, `badge.tsx`) y están construidos estrictamente sobre `@base-ui/react`.
- **Regla Shadcn/Radix:** `shadcn` es EXCLUSIVAMENTE la CLI que generó los archivos; NO es una librería de runtime. `@radix-ui/react-icons` se usa solo para iconografía.
- **Componentes Complejos:** Interfaces como Drawers, Kanban o tablas de gestión se arman **a mano** usando Tailwind v4 sobre los primitivos base. No importar componentes complejos pre-hechos.

## ⚡ Next.js App Router (React 19)
- **RSC por Defecto:** Todos son Server Components por defecto.
- **Client Components:** Aislar `'use client';` al nivel más bajo posible del árbol, únicamente cuando se requiera interactividad (estado, hooks).
- **Data Fetching:** Obtener datos en el Server Component y pasarlos como *props*.

## 💅 Estilos (Tailwind CSS v4)
- **Cero Configuración:** Sin `tailwind.config.js`. Todo el tema vive en `src/app/globals.css`.
- **Tema:** Diseño *dark-first*. Usar el dorado (`#D4AF37`) para acciones principales.
