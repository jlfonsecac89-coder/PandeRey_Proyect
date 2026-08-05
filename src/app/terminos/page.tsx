import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/legal/terms";

export const metadata = {
  title: "Términos y Condiciones — Pan de Rey",
};

export default async function TerminosPage() {
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, contact_address, contact_phone, contact_email")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed text-foreground/80">
      <h1 className="text-xl font-semibold text-gold">Términos y Condiciones</h1>
      <p className="mt-1 text-xs text-foreground/40">Versión {TERMS_VERSION}</p>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">1. Objeto y aceptación</h2>
        <p>
          Estos términos regulan el uso de la plataforma de {store?.name ?? "Pan de Rey"} para comprar productos de
          panadería, pastelería y cafetería, con retiro en tienda o despacho a domicilio. Crear una cuenta o
          realizar un pedido implica la aceptación de esta versión de los Términos y Condiciones.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">2. Cuenta de usuario</h2>
        <p>
          Sos responsable de mantener la confidencialidad de tu contraseña y de la información que registrás en tu
          cuenta (nombre, teléfono, direcciones). Podés editar tus datos personales desde &quot;Mi Cuenta&quot; en
          cualquier momento.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          3. Productos, precios y stock
        </h2>
        <p>
          Los precios se muestran en pesos chilenos (CLP) e incluyen los impuestos aplicables. El stock exhibido en
          la tienda es referencial: se confirma en forma definitiva al momento del pago, ya que puede variar por
          disponibilidad de producción diaria.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">4. Pago</h2>
        <p>
          Aceptamos pago con tarjeta a través de Mercado Pago y transferencia bancaria (validada manualmente por
          nuestro equipo). Un pedido no se considera confirmado hasta que el pago sea aprobado.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          5. Retiro y despacho
        </h2>
        <p>
          Podés elegir retirar tu pedido en tienda o recibirlo a domicilio dentro del radio de despacho de la
          sucursal. El costo de envío se calcula según la distancia real hasta tu dirección y se muestra antes de
          pagar. La confirmación de entrega se hace con un código que solo vos y el repartidor conocen.
        </p>
      </section>

      <section className="mt-6 space-y-2 rounded-lg border border-gold-dark/40 bg-charcoal-light p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-hover">
          6. Derecho a retracto — exención
        </h2>
        <p>
          La Ley N.º 19.496 sobre Protección de los Derechos de los Consumidores reconoce, en las compras a
          distancia, un derecho a retracto general. Sin embargo, la misma ley exceptúa de este derecho a los bienes
          perecibles y a los productos confeccionados conforme a especificaciones del consumidor o claramente
          personalizados.
        </p>
        <p>
          Todos los productos de {store?.name ?? "Pan de Rey"} son de elaboración artesanal y perecible (pan,
          pastelería, productos de cafetería), y muchos —como tortas de cumpleaños u otros productos por
          encargo— se preparan a pedido con las características que elige cada cliente (relleno, cobertura, tamaño,
          mensajes personalizados). Por esa razón, <strong>no aplica el derecho a retracto</strong> una vez que el
          pago fue confirmado y el pedido entró en preparación.
        </p>
        <p>
          Esto no afecta tu derecho a reclamar por un producto que llegue en mal estado, incompleto o distinto a lo
          pedido — esos casos se resuelven contactando directamente a nuestro equipo.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          7. Puntos y promociones
        </h2>
        <p>
          El programa de puntos y las promociones vigentes se rigen por las condiciones publicadas en cada caso
          (vigencia, monto mínimo, tope de usos). Nos reservamos el derecho de modificar o dar de baja promociones
          hacia adelante, sin afectar canjes ya confirmados.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          8. Datos personales y cookies
        </h2>
        <p>
          Tratamos tus datos personales conforme a la Ley N.º 19.628 sobre Protección de la Vida Privada. Usamos
          cookies necesarias para el funcionamiento del sitio y, solo con tu consentimiento explícito, cookies de
          analítica y marketing (podés cambiar tu elección desde el aviso de cookies).
        </p>
        <p>
          Podés solicitar la baja y anonimización de tu cuenta desde &quot;Mi Cuenta&quot;. Al hacerlo, tus datos
          personales (nombre, teléfono, RUT) se eliminan de forma irreversible; tu historial de pedidos y
          comprobantes se conservan de forma anonimizada, por obligaciones legales de retención tributaria.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          9. Modificaciones
        </h2>
        <p>
          Podemos actualizar estos Términos y Condiciones. Los cambios aplican a las cuentas nuevas y a las
          aceptaciones futuras; cada cuenta registra qué versión aceptó y cuándo.
        </p>
      </section>

      {(store?.contact_address || store?.contact_email || store?.contact_phone) && (
        <section className="mt-6 space-y-1 border-t border-charcoal-border pt-4 text-foreground/50">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">10. Contacto</h2>
          {store?.contact_address && <p>{store.contact_address}</p>}
          <p>
            {store?.contact_phone && <span>{store.contact_phone}</span>}
            {store?.contact_phone && store?.contact_email && " · "}
            {store?.contact_email && <span>{store.contact_email}</span>}
          </p>
        </section>
      )}
    </div>
  );
}
