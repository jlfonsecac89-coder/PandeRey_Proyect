import type { Metadata } from "next";
import { Manrope, EB_Garamond } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/shop/CartSidebar";
import Script from "next/script";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pan de Rey | Panadería Artesanal Premium",
  description: "Panadería y pastelería artesanal de alta calidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-gold selection:text-black">
        <CartProvider>
          {children}
          <CartSidebar />
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        </CartProvider>
      </body>
    </html>
  );
}
