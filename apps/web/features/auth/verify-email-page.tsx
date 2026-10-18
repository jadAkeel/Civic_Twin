"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { citymindApi } from "@/lib/api-client";

import { AuthCard, Notice, ResendVerification, accountRequestErrorMessage, takeTokenFromLocation } from "./auth-card";

type VerifyState = { kind: "verifying" } | { kind: "verified" } | { kind: "failed"; message: string };

export function VerifyEmailPage() {
  const [state, setState] = useState<VerifyState>({ kind: "verifying" });
  // React strict mode runs effects twice in development; verify only once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = takeTokenFromLocation();
    if (!token) {
      setState({ kind: "failed", message: "هذا الرابط غير مكتمل. افتح الرابط كما وصلك في الرسالة." });
      return;
    }
    citymindApi.auth
      .verifyEmail(token)
      .then(() => setState({ kind: "verified" }))
      .catch((error: unknown) => setState({ kind: "failed", message: accountRequestErrorMessage(error) }));
  }, []);

  return (
    <AuthCard title="تأكيد البريد الإلكتروني">
      {state.kind === "verifying" ? <Notice tone="info">جارٍ تأكيد بريدك الإلكتروني…</Notice> : null}
      {state.kind === "verified" ? (
        <>
          <Notice tone="success">تم تأكيد بريدك الإلكتروني وتفعيل حسابك. يمكنك الآن تسجيل الدخول.</Notice>
          <p className="mt-4 text-center text-sm">
            <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
              تسجيل الدخول
            </Link>
          </p>
        </>
      ) : null}
      {state.kind === "failed" ? (
        <>
          <Notice tone="error">{state.message}</Notice>
          <ResendVerification />
        </>
      ) : null}
    </AuthCard>
  );
}
