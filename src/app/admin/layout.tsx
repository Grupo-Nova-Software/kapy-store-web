import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Kapy Admin" },
  // Admin-only PWA: installs as "Kapy Admin" and opens straight into /admin.
  manifest: "/admin.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Kapy Admin", statusBarStyle: "default" },
  icons: { icon: "/branding/logo.png", apple: "/branding/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  // Inputs at 16px avoid iOS zoom; keep pinch-zoom for accessibility.
  viewportFit: "cover",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-dvh flex-1 flex-col">{children}</div>;
}
