import type { Metadata } from "next";

import { ResetPasswordPage } from "@/features/auth/reset-password-page";

export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة", robots: { index: false } };

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
}
