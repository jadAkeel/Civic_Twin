import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false } };

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
