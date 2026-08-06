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
    <footer className="bg-burgundy text-[#F3E4D8]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <div className="text-[#F3E4D8]">
              <Logo />
            </div>
            <p className="mt-3 max-w-xs text-sm text-[#F3E4D8]/70">
              Panadería, pastelería y cafetería artesanal — horneado todos los días.
            </p>
            <SocialIcons
              links={socialLinks}
              className="mt-4"
              linkClassName="text-[#F3E4D8]/70 hover:text-[#F3E4D8]"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#E8B15C]">Navegar</p>
            <ul className="mt-3 space-y-2 text-sm text-[#F3E4D8]/75">
              <li>
                <Link href="/tienda" className="hover:text-[#F3E4D8]">
                  Tienda
                </Link>
              </li>
              <li>
                <Link href="/seguimiento" className="hover:text-[#F3E4D8]">
                  Seguir mi pedido
                </Link>
              </li>
              <li>
                <Link href="/cuenta" className="hover:text-[#F3E4D8]">
                  Mi cuenta
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-[#F3E4D8]">
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#E8B15C]">Contacto</p>
            <div className="mt-3 space-y-1.5 text-sm text-[#F3E4D8]/75">
              {contactAddress && <p>{contactAddress}</p>}
              {contactPhone && (
                <p>
                  <a href={`tel:${contactPhone}`} className="hover:text-[#F3E4D8]">
                    {contactPhone}
                  </a>
                </p>
              )}
              {contactEmail && (
                <p>
                  <a href={`mailto:${contactEmail}`} className="hover:text-[#F3E4D8]">
                    {contactEmail}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#E8B15C]">¿Ya pediste?</p>
            <p className="mt-3 text-sm leading-relaxed text-[#F3E4D8]/75">
              Consultá el estado de tu pedido con el código y el email de la compra.
            </p>
            <Link
              href="/seguimiento"
              className="mt-3 inline-block rounded-full border border-[#F3E4D8]/30 px-4 py-1.5 text-xs font-medium text-[#F3E4D8] transition hover:border-[#F3E4D8]/60"
            >
              Ir a seguimiento →
            </Link>
          </div>
        </div>

        <p className="mt-12 border-t border-[#F3E4D8]/15 pt-6 text-xs text-[#F3E4D8]/50">
          © {new Date().getFullYear()} {storeName ?? "Pan de Rey"}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
