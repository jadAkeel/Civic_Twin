"use client";

import { CITY_LABEL, DEMO_DATA_NOTICE, PHASE_FOUR_ROUTES, PROJECT_NAME } from "@citymind/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const residentRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Resident");
const municipalityRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Municipality");
const mobileRoutes = PHASE_FOUR_ROUTES.filter((route) =>
  ["dashboard", "map", "reports", "mobility", "admin"].includes(route.key),
);

const routeIcons: Record<string, string> = {
  dashboard: "DB",
  map: "MP",
  reports: "RP",
  "green-score": "GS",
  mobility: "MO",
  simulator: "SI",
  predictions: "PR",
  "ask-city": "AI",
  admin: "AD",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-full min-h-screen flex-col">
            <div className="border-b border-slate-200 px-5 py-5">
              <Link href="/dashboard" className="block">
                <p className="text-lg font-semibold tracking-normal text-slate-950">{PROJECT_NAME}</p>
                <p className="mt-1 text-sm text-slate-600">{CITY_LABEL}</p>
              </Link>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="green">Resident portal</Badge>
                <Badge tone="blue">Municipality workspace</Badge>
              </div>
            </div>

            <nav className="flex-1 space-y-6 px-3 py-4" aria-label="CityMind modules">
              <RouteGroup title="For residents" routes={residentRoutes} pathname={pathname} />
              <RouteGroup title="Municipality" routes={municipalityRoutes} pathname={pathname} />
            </nav>

            <div className="border-t border-slate-200 p-4">
              <p className="text-xs leading-5 text-slate-500">{DEMO_DATA_NOTICE}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">CityMind Tripoli</p>
                <h1 className="mt-1 text-lg font-semibold text-slate-950">
                  Citizen services and municipal intelligence
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">Tripoli focused</Badge>
                <Badge tone="amber">Demo GIS</Badge>
                <Badge tone="blue">Mobile ready</Badge>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobileRoutes.map((route) => {
          const active = pathname === route.path || pathname.startsWith(`${route.path}/`);

          return (
            <Link
              key={route.key}
              href={route.path}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold",
                active ? "bg-slate-900 text-white" : "text-slate-600",
              )}
            >
              <span>{routeIcons[route.key]}</span>
              <span className="max-w-full truncate">{route.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RouteGroup({
  title,
  routes,
  pathname,
}: {
  title: string;
  routes: typeof PHASE_FOUR_ROUTES;
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 text-xs font-semibold uppercase tracking-normal text-slate-500">{title}</p>
      <div className="mt-2 space-y-1">
        {routes.map((route) => {
          const active = pathname === route.path || pathname.startsWith(`${route.path}/`);

          return (
            <Link
              key={route.key}
              href={route.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                  active ? "border-white/20 bg-white/10" : "border-slate-200 bg-white",
                )}
              >
                {routeIcons[route.key]}
              </span>
              <span className="min-w-0 flex-1 truncate">{route.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
