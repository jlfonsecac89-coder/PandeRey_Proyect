import { redirect } from "next/navigation";

// Paso 7 del blueprint admin-redesign — esta vista se unificó dentro de
// /admin/promociones (pestaña "Rendimiento"). El archivo se mantiene como
// redirect en vez de borrarse hasta que el epic 07-decommission lo remueva,
// para no dejar la ruta vieja en 404 mientras se verifica el cambio.
export default function AnalisisOfertasPage() {
  redirect("/admin/promociones?tab=rendimiento");
}
