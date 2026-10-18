import { NextResponse, type NextRequest } from "next/server";

function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8100").origin;
  } catch {
    return "http://127.0.0.1:8100";
  }
}

/**
 * Per-request nonce CSP. Next.js reads the nonce from the request's CSP header and
 * stamps it on its own scripts, so no inline script without the nonce can run —
 * unlike the previous `script-src 'unsafe-inline'`, which let any injected
 * <script> execute.
 */
function contentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${apiOrigin()} https://tile.openstreetmap.org`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://commons.wikimedia.org https://upload.wikimedia.org",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // Tailwind utilities, next/font and MapLibre set inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ];
  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Static build output, public images and the MapLibre worker (whose own module
      // import would be blocked by a document CSP) are excluded.
      source: "/((?!_next/static|_next/image|favicon.ico|brand/|vendor/|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
