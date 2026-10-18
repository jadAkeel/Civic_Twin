import type { AuthLoginResponse } from "@/lib/api-client";

export const AUTH_SESSION_STORAGE_KEY = "citymind.localSession";
export const AUTH_SESSION_EVENT = "citymind.authSessionChanged";

/**
 * What the browser remembers about the signed-in user: name, role and the CSRF
 * token. The credential itself is an HttpOnly cookie that script cannot read.
 *
 * Storage access is wrapped because some locked-down or private browsing modes
 * throw on localStorage, and that must not crash the application shell.
 */
export function readStoredAuthSession(): AuthLoginResponse | null {
  if (typeof window === "undefined") return null;

  let rawSession: string | null = null;
  try {
    rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as AuthLoginResponse;
    if (!parsed?.user?.email || !parsed.user.role) throw new Error("incomplete session");
    return parsed;
  } catch {
    safeRemove();
    return null;
  }
}

export function storeAuthSession(session: AuthLoginResponse) {
  // Never persist a bearer token, even if an API client response included one.
  const { access_token: _discarded, ...rest } = session;
  void _discarded;
  try {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // Storage unavailable: the cookie session still works for this page view.
  }
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession() {
  safeRemove();
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

function safeRemove() {
  try {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Nothing further to clean up.
  }
}
