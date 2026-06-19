"use client";

import { CITY_LABEL, DEMO_DATA_NOTICE, PHASE_FOUR_ROUTES, PROJECT_NAME } from "@citymind/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/cn";
import type { AuthLoginResponse, CityMindUserRole } from "@/lib/api-client";
import { AUTH_SESSION_EVENT, clearAuthSession, readStoredAuthSession } from "@/lib/auth-session";

const residentRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Resident");
const municipalityRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Municipality");

const OPERATIONS_ROLES: CityMindUserRole[] = [
  "owner",
  "municipality_admin",
  "decision_maker",
  "analyst",
  "police",
  "red_cross",
  "civil_defense",
];

const routeIcons: Record<string, string> = {
  dashboard: "لو",
  map: "خر",
  reports: "بل",
  "green-score": "أخ",
  mobility: "تن",
  simulator: "مح",
  predictions: "تو",
  "ask-city": "اس",
  admin: "إد",
};

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <Loader />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthLoginResponse | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);

  useEffect(() => {
    function syncSession() {
      setSession(readStoredAuthSession());
      setHasLoadedSession(true);
    }

    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const canSeeMunicipality = session ? OPERATIONS_ROLES.includes(session.user.role) : false;
  const visibleRoutes = useMemo(
    () => (canSeeMunicipality ? [...residentRoutes, ...municipalityRoutes] : residentRoutes),
    [canSeeMunicipality],
  );
  const mobileRoutes = visibleRoutes.filter((route) =>
    canSeeMunicipality
      ? ["dashboard", "map", "reports", "mobility", "admin"].includes(route.key)
      : ["map", "reports", "green-score", "mobility", "ask-city"].includes(route.key),
  );
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (!hasLoadedSession || session || isAuthRoute) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hasLoadedSession, isAuthRoute, pathname, router, session]);

  useEffect(() => {
    if (!hasLoadedSession || !session || !isAuthRoute) return;
    router.replace(canSeeMunicipality ? "/admin" : "/");
  }, [canSeeMunicipality, hasLoadedSession, isAuthRoute, router, session]);

  if (!hasLoadedSession) {
    return <LoadingScreen />;
  }

  if (isAuthRoute) {
    if (session) {
      return <LoadingScreen />;
    }

    return <>{children}</>;
  }

  function signOut() {
    setSession(null);
    clearAuthSession();
    router.push("/login");
  }

  if (!session) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-l border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-full min-h-screen flex-col">
            <div className="border-b border-slate-200 px-5 py-5">
              <Link href="/dashboard" className="block">
                <p className="text-lg font-semibold tracking-normal text-slate-950">{PROJECT_NAME}</p>
                <p className="mt-1 text-sm text-slate-600">{CITY_LABEL}</p>
              </Link>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="green">بوابة المواطن</Badge>
                {canSeeMunicipality ? <Badge tone="blue">مساحة العمليات</Badge> : null}
              </div>
            </div>

            <nav className="flex-1 space-y-6 px-3 py-4" aria-label="وحدات CityMind">
              <RouteGroup title="للمواطنين" routes={residentRoutes} pathname={pathname} />
              {canSeeMunicipality ? (
                <RouteGroup title={session?.user.role === "owner" ? "مساحة رئيس البلدية" : "البلدية"} routes={municipalityRoutes} pathname={pathname} />
              ) : null}
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
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  {canSeeMunicipality ? "وصول الجهات والبلدية" : "وصول المواطن"}
                </p>
                <h1 className="mt-1 text-lg font-semibold text-slate-950">
                  {canSeeMunicipality ? "مساحة عمليات طرابلس" : "خدمات مواطني طرابلس"}
                </h1>
              </div>
              <div className="flex justify-end">
                <button className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700" type="button" onClick={signOut}>
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden"
        aria-label="التنقل على الجوال"
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
