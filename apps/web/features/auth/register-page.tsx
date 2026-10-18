"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { ApiClientError, citymindApi, isVerificationPending } from "@/lib/api-client";
import { readStoredAuthSession, storeAuthSession } from "@/lib/auth-session";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password-policy";

import { AuthCard, Notice, ResendVerification } from "./auth-card";

function registerErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return "هذا البريد الإلكتروني مسجل مسبقًا. جرّب تسجيل الدخول.";
    if (error.status === 422) return "تحقق من البيانات: الاسم والبريد الإلكتروني وكلمة مرور قوية مطلوبة.";
    if (error.status === 429) return "محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم أعد المحاولة.";
    if (error.status === 0) return "تعذّر الوصول إلى خدمة CityMind. تحقق من الاتصال ثم أعد المحاولة.";
  }
  return "تعذّر إنشاء الحساب الآن. أعد المحاولة بعد قليل.";
}

export function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = readStoredAuthSession();
    if (savedSession) {
      router.replace(savedSession.user.role === "citizen" ? "/" : "/admin");
    }
  }, [router]);

  const policyProblem = password ? passwordProblem(password, email) : null;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRegistering) return;

    const problem = passwordProblem(password, email);
    if (fullName.trim().length < 2) {
      setAuthMessage("اكتب اسمك الكامل.");
      return;
    }
    if (problem) {
      setAuthMessage(problem);
      return;
    }
    if (password !== confirmPassword) {
      setAuthMessage("كلمتا المرور غير متطابقتين.");
      return;
    }
    if (!acceptedPrivacy) {
      setAuthMessage("يجب الموافقة على سياسة الخصوصية لإنشاء حساب.");
      return;
    }

    setIsRegistering(true);
    setAuthMessage("");
    try {
      const result = await citymindApi.auth.register(fullName.trim(), email.trim(), password, acceptedPrivacy);
      setPassword("");
      setConfirmPassword("");
      if (isVerificationPending(result)) {
        setPendingEmail(result.email);
        return;
      }
      storeAuthSession(result);
      router.push("/");
    } catch (error) {
      setAuthMessage(registerErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  }

  if (pendingEmail) {
    return (
      <AuthCard title="تحقق من بريدك الإلكتروني">
        <Notice tone="success">
          أرسلنا رابط تأكيد إلى <span dir="ltr">{pendingEmail}</span>. افتح الرابط لتفعيل حسابك ثم سجّل الدخول. ينتهي
          الرابط خلال 48 ساعة، وإذا لم تجد الرسالة تحقق من مجلد الرسائل غير المرغوب فيها.
        </Notice>
        <ResendVerification initialEmail={pendingEmail} />
        <p className="mt-4 text-center text-sm">
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
            الذهاب إلى تسجيل الدخول
          </Link>
        </p>
      </AuthCard>
    );
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
                maxLength={160}
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
                autoComplete="new-password"
                aria-describedby="password-policy"
                aria-invalid={Boolean(policyProblem)}
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={128}
                required
              />
            </label>
            <p
              id="password-policy"
              className={`-mt-2 text-xs leading-5 ${policyProblem ? "text-rose-700" : "text-slate-500"}`}
            >
              {policyProblem ??
                `${PASSWORD_MIN_LENGTH} أحرف على الأقل، مع ثلاثة أنواع من: أحرف عربية أو لاتينية، أرقام، رموز أو مسافات.`}
            </p>
            <label className="block text-sm font-medium text-slate-700">
              تأكيد كلمة المرور
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                type="password"
                autoComplete="new-password"
                aria-describedby={mismatch ? "password-mismatch" : undefined}
                aria-invalid={mismatch}
                maxLength={128}
                required
              />
            </label>
            {mismatch ? (
              <p id="password-mismatch" className="-mt-2 text-xs text-rose-700">
                كلمتا المرور غير متطابقتين.
              </p>
            ) : null}
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                aria-required="true"
              />
              <span>
                قرأت{" "}
                <Link className="font-semibold text-teal-700 underline" href="/privacy" target="_blank" rel="noopener">
                  سياسة الخصوصية
                </Link>{" "}
                وأوافق على معالجة بياناتي لاستلام بلاغاتي ومتابعتها.
              </span>
            </label>
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
