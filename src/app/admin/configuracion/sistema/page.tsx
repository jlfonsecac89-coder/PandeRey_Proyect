import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { SistemaForm } from "./SistemaForm";

export default async function ConfiguracionSistemaPage() {
  await requireRole(["admin"], "/admin-login");
  const settings = await getSystemSettings();

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Configuración</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Ajustes del sistema</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Parámetros operativos del día a día. Las credenciales de pago y las claves de seguridad no viven acá —
        esas quedan solo en las variables de entorno del hosting, por seguridad.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <SistemaForm settings={settings} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <p className="text-sm font-medium text-foreground">WhatsApp de contacto y pagos por transferencia</p>
        <p className="mt-1 text-sm text-foreground-muted">
          Se configura por sucursal (cada local puede tener su propio número), no acá.
        </p>
        <Link
          href="/admin/configuracion/sucursales"
          className="mt-2 inline-block text-sm text-gold-dark hover:text-gold"
        >
          Ir a Envíos y sucursales →
        </Link>
      </div>
    </div>
  );
}
