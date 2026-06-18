import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "CityMind Tripoli",
  description: "AI-Powered Urban Digital Twin for Tripoli, Lebanon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
