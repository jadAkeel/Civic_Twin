import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "CityMind Tripoli",
  description: "منصة مدنية رقمية لمدينة طرابلس، لبنان",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
