import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: {
    default: "CityMind Tripoli",
    template: "%s · CityMind Tripoli",
  },
  description: "منصة مدنية رقمية لمدينة طرابلس، لبنان",
  applicationName: "CityMind Tripoli",
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#061a32",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the request headers opts every page into per-request rendering, which
  // is what lets Next.js stamp the middleware's CSP nonce onto its scripts. A
  // statically prerendered page would carry no nonce and be blocked by the CSP.
  await headers();

  return (
    <html lang="ar" dir="rtl">
      <body>
        <a className="city-skip-link" href="#citymind-main">
          تخطَّ إلى المحتوى الرئيسي
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
