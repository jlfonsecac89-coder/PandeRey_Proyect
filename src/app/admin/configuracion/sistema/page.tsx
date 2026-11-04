import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { getSystemSettings, getRefundPolicy, getCustomRefundTemplate } from "@/lib/settings/system-settings";
import { DEFAULT_REFUND_TEMPLATE } from "@/lib/orders/refund-policy";
import { getModuleFlags } from "@/lib/settings/modules";
import { SistemaForm } from "./SistemaForm";
import { ModulosForm } from "./ModulosForm";
import { RefundPolicyForm } from "./RefundPolicyForm";

export default async function ConfiguracionSistemaPage() {
  await requireRole(["admin"], "/admin-login");
  const [settings, moduleFlags, refundPolicy, customRefund] = await Promise.all([
    getSystemSettings(),
    getModuleFlags(),
    getRefundPolicy(),
    getCustomRefundTemplate(),
  ]);

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Configuración</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Ajustes del sistema</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Parámetros operativos del día a día. Las credenciales de pago y las claves de seguridad no viven aquí —
        esas quedan solo en las variables de entorno del hosting, por seguridad.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Módulos</p>
        <p className="mb-4 text-xs text-foreground/50">
          Funciones ya desarrolladas que se pueden encender cuando el negocio las necesite. Apagar un módulo solo lo
          oculta y lo bloquea — no borra datos ni código.
        </p>
        <ModulosForm flags={moduleFlags} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <SistemaForm settings={settings} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          Términos: cancelaciones, devoluciones y reembolsos
        </p>
        <p className="mb-4 text-xs text-foreground/50">
          Es la sección 7 de los Términos y Condiciones. Los plazos (días mínimo, máximo y de abono en débito) se
          cambian arriba; aquí editas el texto completo.
        </p>
        <RefundPolicyForm template={customRefund?.template ?? DEFAULT_REFUND_TEMPLATE} policy={refundPolicy} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <p className="text-sm font-medium text-foreground">WhatsApp de contacto y pagos por transferencia</p>
        <p className="mt-1 text-sm text-foreground-muted">
          Se configura por sucursal (cada local puede tener su propio número), no aquí.
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
