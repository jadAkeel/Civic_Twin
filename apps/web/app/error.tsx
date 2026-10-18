"use client";

import Link from "next/link";
import { useEffect } from "react";

import { reportClientError } from "@/lib/api-client";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only identifier that ties this screen to a server log line.
    console.error("citymind_route_error", error.digest ?? error.message);
    reportClientError({ message: error.message, digest: error.digest, boundary: "route" });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <h1 className="text-xl font-bold text-rose-950">تعذّر عرض هذه الصفحة</h1>
      <p className="text-sm leading-6 text-rose-900">
        حدث خطأ غير متوقع أثناء عرض هذا القسم من CityMind. لم يُفقد أي بلاغ أو بيانات، ولم تُعرض أرقام تقديرية بدل
        البيانات الحقيقية.
      </p>
      {error.digest ? (
        <p className="text-xs text-rose-800">
          رمز الخطأ للدعم الفني: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button className="city-primary-button" type="button" onClick={reset}>
          إعادة المحاولة
        </button>
        <Link className="city-secondary-button" href="/">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
