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
    <footer className="border-t border-charcoal-border bg-background-elevated/40">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-foreground-muted">
              Panadería, pastelería y cafetería artesanal — horneado todos los días.
            </p>
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
              {contactPhone && <p>{contactPhone}</p>}
              {contactEmail && <p>{contactEmail}</p>}
            </div>
            <SocialIcons links={socialLinks} className="mt-4" />
          </div>
        </div>

        <p className="mt-10 border-t border-charcoal-border pt-6 text-xs text-foreground-muted/70">
          © {new Date().getFullYear()} {storeName ?? "Pan de Rey"}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
