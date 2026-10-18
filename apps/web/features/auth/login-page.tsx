"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { ApiClientError, citymindApi, type CityMindUserRole } from "@/lib/api-client";
import { readStoredAuthSession, storeAuthSession } from "@/lib/auth-session";

import { ResendVerification } from "./auth-card";

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

/** Only same-origin relative paths are honoured, so `next` cannot become an open redirect. */
function getNextRoute(role: CityMindUserRole) {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    requestedPath?.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !requestedPath.startsWith("/\\") &&
    !requestedPath.startsWith("/login") &&
    !requestedPath.startsWith("/register")
  ) {
    return requestedPath;
  }

  return defaultRouteForRole(role);
}

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (error.status === 429) return "محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم أعد المحاولة.";
    if (error.status === 0) return "تعذّر الوصول إلى خدمة CityMind. تحقق من الاتصال ثم أعد المحاولة.";
    if (error.status && error.status >= 500) return "الخدمة غير متاحة مؤقتًا. أعد المحاولة بعد قليل.";
  }
  return "تعذّر تسجيل الدخول الآن. أعد المحاولة.";
}

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const savedSession = readStoredAuthSession();
    if (savedSession) {
      router.replace(getNextRoute(savedSession.user.role));
      return;
    }
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      setNotice("انتهت جلستك لحماية حسابك. سجّل الدخول مجددًا لمتابعة العمل من حيث توقفت.");
    }
  }, [router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthMessage("");
    setNeedsVerification(false);

    try {
      const nextSession = await citymindApi.auth.login(email.trim(), password);
      storeAuthSession(nextSession);
      setPassword("");
      router.push(getNextRoute(nextSession.user.role));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        // Correct password, but the address has not been confirmed yet.
        setNeedsVerification(true);
        setAuthMessage("لم يتم تأكيد بريدك الإلكتروني بعد. افتح رابط التأكيد الذي أرسلناه إليك، أو اطلب رابطًا جديدًا.");
      } else {
        setAuthMessage(loginErrorMessage(error));
      }
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
          {notice ? (
            <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900" role="status">
              {notice}
            </p>
          ) : null}
          <form className="mt-5 space-y-4" onSubmit={signIn} noValidate={false}>
            <label className="block text-sm font-medium text-slate-700">
              البريد الإلكتروني
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                maxLength={255}
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
                maxLength={128}
                required
              />
            </label>
            <p className="-mt-2 text-left text-sm">
              <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/forgot-password">
                نسيت كلمة المرور؟
              </Link>
            </p>
            <div aria-live="assertive">
              {authMessage ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                  {authMessage}
                </p>
              ) : null}
            </div>
            <button
              className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={isSigningIn}
            >
              {isSigningIn ? "جارٍ الدخول" : "دخول"}
            </button>
          </form>
          {needsVerification ? <ResendVerification initialEmail={email.trim()} /> : null}
          <p className="mt-4 text-center text-sm text-slate-600">
            ما عندك حساب؟{" "}
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/register">
              إنشاء حساب
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-slate-500">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/privacy">
              سياسة الخصوصية
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
