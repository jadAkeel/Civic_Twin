"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { ApiClientError, citymindApi } from "@/lib/api-client";
import { readStoredAuthSession, storeAuthSession } from "@/lib/auth-session";

export function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const savedSession = readStoredAuthSession();
    if (savedSession) {
      router.replace(savedSession.user.role === "citizen" ? "/" : "/admin");
    }
  }, [router]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRegistering(true);

    try {
      const nextSession = await citymindApi.auth.register(fullName, email, password);
      storeAuthSession(nextSession);
      setPassword("");
      setAuthMessage("");
      router.push("/");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setAuthMessage("هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول.");
      } else {
        setAuthMessage("تعذر إنشاء الحساب التجريبي الآن. تأكد من البيانات وحاول مجدداً.");
      }
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase text-teal-700">CityMind Tripoli</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">إنشاء حساب جديد</h1>
          <form className="mt-5 space-y-4" onSubmit={register}>
            <label className="block text-sm font-medium text-slate-700">
              الاسم الكامل
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="اسمك الكامل"
                type="text"
                autoComplete="name"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              البريد الإلكتروني
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
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
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            {authMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{authMessage}</p> : null}
            <button
              className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={isRegistering}
            >
              {isRegistering ? "جارٍ إنشاء الحساب" : "إنشاء حساب"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            عندك حساب؟{" "}
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
              سجّل الدخول
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
