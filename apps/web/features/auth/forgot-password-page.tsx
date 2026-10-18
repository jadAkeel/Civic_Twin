"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { citymindApi } from "@/lib/api-client";

import { AuthCard, Notice, accountRequestErrorMessage, inputClassName, primaryButtonClassName } from "./auth-card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setError("");
    try {
      await citymindApi.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (caught) {
      setError(accountRequestErrorMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthCard title="نسيت كلمة المرور">
      {sent ? (
        <>
          {/* Same message whether or not the address has an account. */}
          <Notice tone="success">
            إذا كان هذا البريد مسجّلًا لدينا فستصله رسالة فيها رابط لتعيين كلمة مرور جديدة خلال دقائق. الرابط يعمل مرة
            واحدة وينتهي خلال 30 دقيقة. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها.
          </Notice>
          <p className="mt-4 text-center text-sm">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
              العودة إلى تسجيل الدخول
            </Link>
          </p>
        </>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <p className="text-sm leading-6 text-slate-600">
            أدخل البريد الإلكتروني لحسابك وسنرسل لك رابطًا لاختيار كلمة مرور جديدة.
          </p>
          <label className="block text-sm font-medium text-slate-700">
            البريد الإلكتروني
            <input
              className={inputClassName}
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
          <div aria-live="assertive">{error ? <Notice tone="error">{error}</Notice> : null}</div>
          <button className={primaryButtonClassName} type="submit" disabled={isSending}>
            {isSending ? "جارٍ الإرسال" : "أرسل رابط إعادة التعيين"}
          </button>
          <p className="text-center text-sm">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
              تذكرت كلمة المرور؟ سجّل الدخول
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
