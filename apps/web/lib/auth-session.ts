import type { AuthLoginResponse } from "@/lib/api-client";

export const AUTH_SESSION_STORAGE_KEY = "citymind.localSession";
export const AUTH_SESSION_EVENT = "citymind.authSessionChanged";

export function readStoredAuthSession(): AuthLoginResponse | null {
  if (typeof window === "undefined") return null;

  const rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthLoginResponse;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeAuthSession(session: AuthLoginResponse) {
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({ ...session, access_token: "" }),
  );
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}
