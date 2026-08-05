import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pan de Rey | Panadería Artesanal Premium",
  description: "Panadería, pastelería y cafetería artesanal — pedidos online con retiro en tienda o despacho a domicilio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
