import type { Metadata } from "next";

import { VerifyEmailPage } from "@/features/auth/verify-email-page";

export const metadata: Metadata = { title: "تأكيد البريد الإلكتروني", robots: { index: false } };

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}
