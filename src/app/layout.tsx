import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Archivo } from "next/font/google";
import "./globals.css";

// Theme fonts. Each collection theme picks which ones it uses through
// --theme-font-display / --theme-font-body (see globals.css).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const alfaSlab = Alfa_Slab_One({
  variable: "--font-alfa-slab",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: "cromodex", template: "%s · cromodex" },
  description: "Intercambio anónimo de cromos",
};

export const viewport: Viewport = {
  themeColor: "#082a3d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${alfaSlab.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-nav font-body text-parchment">
        {children}
      </body>
    </html>
  );
}
