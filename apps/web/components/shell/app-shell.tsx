"use client";

import { CITY_LABEL, DEMO_DATA_NOTICE, PHASE_FOUR_ROUTES, PROJECT_NAME } from "@citymind/shared";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CityIcon, type CityIconName } from "@/components/ui/city-icon";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/cn";
import { AUTH_SESSION_EXPIRED_EVENT, citymindApi, type AuthLoginResponse, type CityMindUserRole } from "@/lib/api-client";
import { AUTH_SESSION_EVENT, clearAuthSession, readStoredAuthSession, storeAuthSession } from "@/lib/auth-session";
import { roleLabel } from "@/lib/display-labels";

const residentRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Resident");
const municipalityRoutes = PHASE_FOUR_ROUTES.filter((route) => route.phase === "Municipality");

const MUNICIPALITY_ROLES: CityMindUserRole[] = ["owner", "municipality_admin", "decision_maker", "analyst"];
const AGENCY_ROLES: CityMindUserRole[] = ["police", "red_cross", "civil_defense"];
const OPERATIONS_ROLES: CityMindUserRole[] = [...MUNICIPALITY_ROLES, ...AGENCY_ROLES];
const municipalPlanningPaths = ["/digital-twin"];
const PUBLIC_STANDALONE_PATHS = ["/privacy", "/forgot-password", "/reset-password", "/verify-email"];
// Re-validate the cookie session this often while the tab is visible. Each check
// also slides the server session forward, so an active operator is never cut off.
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const routeIcons: Record<string, CityIconName> = {
  dashboard: "dashboard",
  map: "map",
  reports: "reports",
  "green-score": "green-score",
  mobility: "mobility",
  simulator: "simulator",
  predictions: "predictions",
  "ask-city": "ask-city",
  admin: "admin",
};

function operationsLabel(role: CityMindUserRole) {
  const labels: Record<CityMindUserRole, string> = {
    owner: "مساحة رئيس البلدية",
    citizen: "بوابة المواطن",
    municipality_admin: "مساحة البلدية",
    decision_maker: "مساحة القرار البلدي",
    analyst: "مساحة التحليل البلدي",
    police: "بوابة الشرطة",
    red_cross: "بوابة الصليب الأحمر اللبناني",
    civil_defense: "بوابة الدفاع المدني",
  };

  return labels[role];
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
      <div className="flex flex-col items-center gap-5">
        <Image
          alt=""
          className="h-16 w-16 rounded-2xl object-cover shadow-lg"
          height={64}
          priority
          src="/brand/citymind-mark.png"
          width={64}
        />
        <Loader />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthLoginResponse | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);

  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    function syncSession() {
      setSession(readStoredAuthSession());
      setHasLoadedSession(true);
    }
    function markExpired() {
      setSessionExpired(true);
    }

    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, markExpired);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, markExpired);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const signedInEmail = session?.user.email ?? null;

  // localStorage only remembers who signed in; the HttpOnly cookie is the real
  // credential. Confirm it with the API on load and periodically, and pick up role
  // or status changes made by an owner without waiting for the next login.
  useEffect(() => {
    if (!signedInEmail) return;
    let active = true;

    async function verify() {
      if (document.visibilityState === "hidden") return;
      try {
        const current = await citymindApi.auth.me();
        if (!active) return;
        const stored = readStoredAuthSession();
        if (!stored) return;
        const changed =
          stored.user.role !== current.role ||
          stored.user.full_name !== current.full_name ||
          stored.user.is_active !== current.is_active;
        if (changed) {
          storeAuthSession({
            ...stored,
            user: { full_name: current.full_name, email: current.email, role: current.role, is_active: current.is_active },
          });
        }
      } catch {
        // A 401 is handled centrally by the API client (storage cleared, expiry event
        // raised). A network failure is not proof the session ended, so the operator
        // stays signed in.
      }
    }

    void verify();
    const interval = window.setInterval(verify, SESSION_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", verify);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", verify);
    };
  }, [signedInEmail]);

  const canSeeOperations = session ? OPERATIONS_ROLES.includes(session.user.role) : false;
  const canSeeMunicipality = session ? MUNICIPALITY_ROLES.includes(session.user.role) : false;
  const isAgencyPortal = session ? AGENCY_ROLES.includes(session.user.role) : false;
  const currentRoute = PHASE_FOUR_ROUTES.find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));
  const isMunicipalPlanningPath = municipalPlanningPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const operationsRoutes = useMemo(
    () => (isAgencyPortal ? municipalityRoutes.filter((route) => route.key === "admin") : municipalityRoutes),
    [isAgencyPortal],
  );
  const visibleRoutes = useMemo(() => {
    if (isAgencyPortal) return operationsRoutes;
    if (canSeeMunicipality) return [...residentRoutes, ...municipalityRoutes];
    return residentRoutes;
  }, [canSeeMunicipality, isAgencyPortal, operationsRoutes]);
  const mobileRoutes = visibleRoutes.filter((route) =>
    isAgencyPortal
      ? route.key === "admin"
      : canSeeMunicipality
        ? ["dashboard", "map", "reports", "mobility", "admin"].includes(route.key)
        : ["map", "reports", "mobility"].includes(route.key),
  );
  const portalTitle = session ? operationsLabel(session.user.role) : "بوابة المواطن";
  const homeHref = isAgencyPortal ? "/admin" : canSeeMunicipality ? "/dashboard" : "/";
  const mobileGridColumns = `repeat(${Math.max(1, Math.min(mobileRoutes.length, 5))}, minmax(0, 1fr))`;
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  // Reachable with or without a session: the privacy notice must be readable before
  // registering, and email links open in whatever state the browser is in.
  const isPublicStandaloneRoute = PUBLIC_STANDALONE_PATHS.includes(pathname);

  useEffect(() => {
    if (!hasLoadedSession || session || isAuthRoute || isPublicStandaloneRoute) return;
    const params = new URLSearchParams({ next: pathname });
    if (sessionExpired) params.set("expired", "1");
    router.replace(`/login?${params.toString()}`);
  }, [hasLoadedSession, isAuthRoute, isPublicStandaloneRoute, pathname, router, session, sessionExpired]);

  useEffect(() => {
    if (!hasLoadedSession || !session || isAuthRoute || !isAgencyPortal || pathname.startsWith("/admin")) return;
    router.replace("/admin");
  }, [hasLoadedSession, isAgencyPortal, isAuthRoute, pathname, router, session]);

  useEffect(() => {
    if (
      !hasLoadedSession ||
      !session ||
      isAuthRoute ||
      canSeeOperations ||
      (currentRoute?.phase !== "Municipality" && !isMunicipalPlanningPath)
    ) {
      return;
    }
    router.replace("/");
  }, [canSeeOperations, currentRoute, hasLoadedSession, isAuthRoute, isMunicipalPlanningPath, router, session]);

  if (isPublicStandaloneRoute) return <div id="citymind-main">{children}</div>;

  if (!hasLoadedSession) return <LoadingScreen />;

  if (isAuthRoute) {
    if (session) return <LoadingScreen />;
    return <div id="citymind-main">{children}</div>;
  }

  async function signOut() {
    try {
      await citymindApi.auth.logout();
    } catch {
      // Local state is still cleared when the API is unavailable.
    }
    setSession(null);
    clearAuthSession();
    router.push("/login");
  }

  if (!session) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-[#061a32] text-white lg:block">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_right,rgba(16,200,195,0.15),transparent_62%)]" />
          <div className="sticky top-0 z-10 flex h-screen flex-col overflow-y-auto">
            <div className="border-b border-white/10 px-5 py-5">
              <Link href={homeHref} className="flex items-center gap-3 rounded-xl focus-visible:outline-teal-300">
                <Image
                  alt="شعار CityMind Tripoli"
                  className="h-14 w-14 rounded-xl object-cover"
                  height={56}
                  priority
                  src="/brand/citymind-mark.png"
                  width={56}
                />
                <span className="min-w-0">
                  <span className="block text-lg font-bold tracking-tight">{PROJECT_NAME}</span>
                  <span className="mt-0.5 block text-xs text-slate-300">{CITY_LABEL}</span>
                </span>
              </Link>
            </div>

            <nav className="flex-1 space-y-6 px-3 py-5" aria-label="وحدات CityMind">
              {!isAgencyPortal ? <RouteGroup title="للمواطنين" routes={residentRoutes} pathname={pathname} /> : null}
              {canSeeOperations ? <RouteGroup title={portalTitle} routes={operationsRoutes} pathname={pathname} /> : null}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-teal-200">
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_0_4px_rgba(45,212,191,0.1)]" />
                جلسة آمنة
              </div>
              <p className="text-[11px] leading-5 text-slate-400">{DEMO_DATA_NOTICE}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-h-16 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                  <CityIcon name="building" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{portalTitle}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {canSeeOperations ? "وصول الجهات والبلدية" : PROJECT_NAME}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2.5 sm:flex">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                    <CityIcon name="user" className="h-4 w-4" />
                  </span>
                  <div className="max-w-40 text-right">
                    <p className="truncate text-sm font-bold text-slate-900">{session.user.full_name}</p>
                    <p className="truncate text-[11px] text-slate-500">{roleLabel(session.user.role)}</p>
                  </div>
                </div>
                <button className="city-secondary-button" type="button" onClick={signOut}>
                  <CityIcon name="logout" className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
                  <span className="sr-only sm:hidden">تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </header>

          <main id="citymind-main" tabIndex={-1} className="px-4 py-5 outline-none sm:px-6 lg:px-8 lg:py-5">
            {children}
          </main>
          <footer className="px-4 pb-28 pt-2 text-xs text-slate-500 sm:px-6 lg:px-8 lg:pb-6">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/privacy">
              سياسة الخصوصية
            </Link>
          </footer>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,35,55,0.08)] backdrop-blur-xl lg:hidden"
        aria-label="التنقل على الجوال"
        style={{ gridTemplateColumns: mobileGridColumns }}
      >
        {mobileRoutes.map((route) => {
          const active = pathname === route.path || pathname.startsWith(`${route.path}/`);

          return (
            <Link
              key={route.key}
              href={route.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-[10px] font-bold transition",
                active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <CityIcon name={routeIcons[route.key] ?? "dashboard"} className="h-5 w-5" />
              <span className="max-w-full truncate">{route.label}</span>
              {active ? <span className="absolute inset-x-3 -top-2 h-0.5 rounded-full bg-teal-400" /> : null}
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
      <p className="px-3 text-[11px] font-bold text-slate-400">{title}</p>
      <div className="mt-2 space-y-1">
        {routes.map((route) => {
          const active = pathname === route.path || pathname.startsWith(`${route.path}/`);

          return (
            <Link
              key={route.key}
              href={route.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {active ? <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-teal-400" /> : null}
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition",
                  active
                    ? "border-teal-400/30 bg-teal-400/10 text-teal-300"
                    : "border-white/10 bg-white/[0.03] text-slate-400 group-hover:text-teal-200",
                )}
              >
                <CityIcon name={routeIcons[route.key] ?? "dashboard"} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate">{route.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
