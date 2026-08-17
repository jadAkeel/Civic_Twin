"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { citymindApi, type CityMindUserRole } from "@/lib/api-client";
import { readStoredAuthSession, storeAuthSession } from "@/lib/auth-session";

const OPERATIONS_ROLES: CityMindUserRole[] = [
  "owner",
  "municipality_admin",
  "decision_maker",
  "analyst",
  "police",
  "red_cross",
  "civil_defense",
];

function defaultRouteForRole(role: CityMindUserRole) {
  return OPERATIONS_ROLES.includes(role) ? "/admin" : "/";
}

function getNextRoute(role: CityMindUserRole) {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//") && requestedPath !== "/login") {
    return requestedPath;
  }

  return defaultRouteForRole(role);
}

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const savedSession = readStoredAuthSession();
    if (savedSession) {
      router.replace(getNextRoute(savedSession.user.role));
    }
  }, [router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);

    try {
      const nextSession = await citymindApi.auth.login(email, password);
      storeAuthSession(nextSession);
      setPassword("");
      setAuthMessage("");
      router.push(getNextRoute(nextSession.user.role));
    } catch {
      setAuthMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة لهذا الحساب التجريبي المحلي.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase text-teal-700">CityMind Tripoli</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">دخول CityMind Tripoli</h1>
          <form className="mt-5 space-y-4" onSubmit={signIn}>
            <label className="block text-sm font-medium text-slate-700">
              البريد الإلكتروني
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              كلمة المرور
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="أدخل كلمة المرور"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            {authMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{authMessage}</p> : null}
            <button
              className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={isSigningIn}
            >
              {isSigningIn ? "جارٍ الدخول" : "دخول"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            ما عندك حساب؟{" "}
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/register">
              إنشاء حساب
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
