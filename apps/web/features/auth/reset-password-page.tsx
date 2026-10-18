"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { citymindApi } from "@/lib/api-client";
import { clearAuthSession } from "@/lib/auth-session";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password-policy";

import {
  AuthCard,
  Notice,
  accountRequestErrorMessage,
  inputClassName,
  primaryButtonClassName,
  takeTokenFromLocation,
} from "./auth-card";

export function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(takeTokenFromLocation());
  }, []);

  const policyProblem = password ? passwordProblem(password) : null;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !token) return;
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await citymindApi.auth.resetPassword(token, password);
      // Every session was revoked server-side; drop the local copy too.
      clearAuthSession();
      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (caught) {
      setError(accountRequestErrorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (token === null) {
    return <AuthCard title="تعيين كلمة مرور جديدة">{null}</AuthCard>;
  }

  if (!token) {
    return (
      <AuthCard title="تعيين كلمة مرور جديدة">
        <Notice tone="error">هذا الرابط غير مكتمل. افتح الرابط كما وصلك في الرسالة، أو اطلب رابطًا جديدًا.</Notice>
        <p className="mt-4 text-center text-sm">
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/forgot-password">
            اطلب رابطًا جديدًا
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="تم تغيير كلمة المرور">
        <Notice tone="success">
          تم حفظ كلمة المرور الجديدة وتسجيل الخروج من جميع الأجهزة. سجّل الدخول الآن بكلمة المرور الجديدة.
        </Notice>
        <p className="mt-4 text-center text-sm">
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
            تسجيل الدخول
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="تعيين كلمة مرور جديدة">
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          كلمة المرور الجديدة
          <input
            className={inputClassName}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            aria-describedby="reset-password-policy"
            aria-invalid={Boolean(policyProblem)}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={128}
            required
          />
        </label>
        <p
          id="reset-password-policy"
          className={`-mt-2 text-xs leading-5 ${policyProblem ? "text-rose-700" : "text-slate-500"}`}
        >
          {policyProblem ??
            `${PASSWORD_MIN_LENGTH} أحرف على الأقل، مع ثلاثة أنواع من: أحرف عربية أو لاتينية، أرقام، رموز أو مسافات.`}
        </p>
        <label className="block text-sm font-medium text-slate-700">
          تأكيد كلمة المرور الجديدة
          <input
            className={inputClassName}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            aria-invalid={mismatch}
            maxLength={128}
            required
          />
        </label>
        {mismatch ? <p className="-mt-2 text-xs text-rose-700">كلمتا المرور غير متطابقتين.</p> : null}
        <div aria-live="assertive">{error ? <Notice tone="error">{error}</Notice> : null}</div>
        <button className={primaryButtonClassName} type="submit" disabled={isSaving}>
          {isSaving ? "جارٍ الحفظ" : "حفظ كلمة المرور الجديدة"}
        </button>
        {error.includes("انتهت صلاحيته") ? (
          <p className="text-center text-sm">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/forgot-password">
              اطلب رابطًا جديدًا
            </Link>
          </p>
        ) : null}
      </form>
    </AuthCard>
  );
}
