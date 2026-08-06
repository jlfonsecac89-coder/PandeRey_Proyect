import type { Metadata } from "next";
import { Fraunces, Work_Sans, Geist_Mono } from "next/font/google";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import "./globals.css";
import { cn } from "@/lib/utils";

// Fraunces (títulos, con carácter de escudo/heráldica) + Work Sans (texto,
// legible y cálido sin caer en el Inter genérico de cualquier dashboard) —
// reemplaza Geist, que no tenía ninguna relación con la identidad de la marca.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pan de Rey | Panadería Artesanal Premium",
  description: "Panadería, pastelería y cafetería artesanal — pedidos online con retiro en tienda o despacho a domicilio.",
  // Next.js prioriza /app/icon.* si existe; en cuanto se agregue
  // public/logo.png esto lo toma como favicon sin más cambios de código.
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn("h-full", "antialiased", fraunces.variable, workSans.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
