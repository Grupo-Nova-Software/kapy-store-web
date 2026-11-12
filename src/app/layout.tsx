import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { CartDrawer } from "@/components/cart/cart-drawer";
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
  title: {
    default: "Kapy Store | Sneakers, auriculares y accesorios",
    template: "%s | Kapy Store",
  },
  description:
    "Sneakers urbanos, auriculares y accesorios. Envíos a todo Paraguay, pago contra entrega o transferencia. Pedí directo por WhatsApp.",
  icons: { icon: "/branding/logo.png", apple: "/branding/logo.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/**
 * Runs before first paint: applies the saved theme, or the system preference
 * when there is none. Avoids a light/dark flash on load.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SiteHeader />
        {children}
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          © Kapy Store · Sneakers, audio y accesorios · Paraguay
        </footer>
        <CartDrawer />
      </body>
    </html>
  );
}
