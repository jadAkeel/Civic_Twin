"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { ApiClientError, citymindApi } from "@/lib/api-client";

/** Shared frame for the standalone account pages (outside the signed-in shell). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase text-teal-700">CityMind Tripoli</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
          {children}
          <p className="mt-6 text-center text-xs text-slate-500">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/privacy">
              سياسة الخصوصية
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "info" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-800",
  }[tone];
  return (
    <p className={`mt-4 rounded-md border p-3 text-sm leading-6 ${styles}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function accountRequestErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return "طلبات كثيرة خلال وقت قصير. انتظر بضع دقائق ثم أعد المحاولة.";
    if (error.status === 422) return "تحقق من البيانات المدخلة ثم أعد المحاولة.";
    if (error.status === 400) return "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.";
    if (error.status === 0) return "تعذّر الوصول إلى خدمة CityMind. تحقق من الاتصال ثم أعد المحاولة.";
  }
  return "تعذّر إكمال الطلب الآن. أعد المحاولة بعد قليل.";
}

/**
 * Read the one-time token from the URL fragment, then remove it from the address
 * bar and history so it is not left behind on a shared or public computer.
 */
export function takeTokenFromLocation(): string {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  return token;
}

export const inputClassName =
  "mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm";
export const primaryButtonClassName =
  "min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400";

/** "Send the verification email again" — the API answers the same for any address. */
export function ResendVerification({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      await citymindApi.auth.resendVerification(email.trim());
      setState("sent");
    } catch (error) {
      setState("error");
      setMessage(accountRequestErrorMessage(error));
    }
  }

  return (
    <form className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={resend}>
      <label className="block text-sm font-medium text-slate-700">
        أرسل رابط التأكيد مجددًا إلى
        <input
          className={inputClassName}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          maxLength={255}
          required
        />
      </label>
      <button className={primaryButtonClassName} type="submit" disabled={state === "sending"}>
        {state === "sending" ? "جارٍ الإرسال" : "إعادة إرسال رابط التأكيد"}
      </button>
      {state === "sent" ? (
        <p className="text-sm leading-6 text-emerald-800" role="status">
          إذا كان هذا البريد بانتظار التأكيد فستصله رسالة خلال دقائق. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-sm text-rose-800" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
