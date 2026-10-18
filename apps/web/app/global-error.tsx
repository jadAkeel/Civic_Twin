"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/api-client";

/**
 * Last-resort boundary: it replaces the root layout, so it must render its own
 * html/body and cannot rely on the app shell, fonts or global styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({ message: error.message, digest: error.digest, boundary: "global" });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f7fa",
          color: "#102038",
          fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
          padding: "1rem",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            background: "#ffffff",
            border: "1px solid #dbe4ec",
            borderRadius: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>تعذّر تشغيل CityMind</h1>
          <p style={{ lineHeight: 1.7, color: "#475569" }}>
            حدث خطأ غير متوقع أثناء تحميل التطبيق. أعد المحاولة، وإذا استمرت المشكلة تواصل مع الدعم الفني مع رمز الخطأ.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#64748b" }}>رمز الخطأ: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            style={{
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#07878a",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
            type="button"
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
