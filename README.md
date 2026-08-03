# Pan de Rey

Plataforma e-commerce/SaaS para panadería artesanal — Next.js (App Router) + Supabase + Mercado Pago.

**El plan completo de arquitectura, seguridad y fases de construcción está en [`BLUEPRINT.md`](./BLUEPRINT.md).** Léelo antes de tocar código — es la fuente de verdad del proyecto.

## Setup local

```bash
npm install
cp .env.example .env.local   # completar con los valores reales (ver BLUEPRINT.md sección 18)
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Referencias del sitio anterior

`docs/legacy-reference/` contiene el logo, la paleta institucional y un catálogo real de 26 productos (con fotos) rescatados del proyecto anterior — usados como semilla de datos y para validar la carga masiva (BLUEPRINT.md sección 13, 20).
