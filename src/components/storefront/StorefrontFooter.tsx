import Link from "next/link";
import { Logo } from "./Logo";
import { SocialIcons } from "./SocialIcons";

type SocialLinks = { instagram?: string; facebook?: string; whatsapp?: string } | null;

export function StorefrontFooter({
  storeName,
  contactAddress,
  contactPhone,
  contactEmail,
  socialLinks = null,
}: {
  storeName?: string;
  contactAddress?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  socialLinks?: SocialLinks;
}) {
  return (
    <footer className="border-t border-charcoal-border bg-background-alt">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-foreground-muted">
              Panadería, pastelería y cafetería artesanal — horneado todos los días.
            </p>
            <SocialIcons links={socialLinks} className="mt-4" linkClassName="text-foreground-muted hover:text-gold" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">Navegar</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
              <li>
                <Link href="/tienda" className="hover:text-gold">
                  Tienda
                </Link>
              </li>
              <li>
                <Link href="/seguimiento" className="hover:text-gold">
                  Seguir mi pedido
                </Link>
              </li>
              <li>
                <Link href="/cuenta" className="hover:text-gold">
                  Mi cuenta
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-gold">
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">Contacto</p>
            <div className="mt-3 space-y-1.5 text-sm text-foreground-muted">
              {contactAddress && <p>{contactAddress}</p>}
              {contactPhone && (
                <p>
                  <a href={`tel:${contactPhone}`} className="hover:text-gold">
                    {contactPhone}
                  </a>
                </p>
              )}
              {contactEmail && (
                <p>
                  <a href={`mailto:${contactEmail}`} className="hover:text-gold">
                    {contactEmail}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">¿Ya pediste?</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
              Consultá el estado de tu pedido con el código y el email de la compra.
            </p>
            <Link
              href="/seguimiento"
              className="mt-3 inline-block rounded-full border border-charcoal-border px-4 py-1.5 text-xs font-medium text-foreground transition hover:border-gold-dark hover:text-gold"
            >
              Ir a seguimiento →
            </Link>
          </div>
        </div>

        <p className="mt-12 border-t border-charcoal-border pt-6 text-xs text-foreground-muted/70">
          © {new Date().getFullYear()} {storeName ?? "Pan de Rey"}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
