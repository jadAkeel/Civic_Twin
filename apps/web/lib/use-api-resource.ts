"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiClientError } from "@/lib/api-client";

export type ResourceStatus = "loading" | "ready" | "error";

export type ApiResource<T> = {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
  errorStatus: number | null;
  reload: () => void;
  isReloading: boolean;
};

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "انتهت الجلسة. سجّل الدخول مجددًا للمتابعة.";
    if (error.status === 403) return "لا تملك صلاحية عرض هذه البيانات.";
    if (error.status === 404) return "البيانات المطلوبة غير موجودة.";
    if (error.status === 429) return "عدد الطلبات كبير. انتظر قليلًا ثم أعد المحاولة.";
    if (error.status === 503) return "الخدمة غير متاحة مؤقتًا. أعد المحاولة بعد قليل.";
    if (error.status && error.status >= 500) return "حدث خطأ في خدمة CityMind. أعد المحاولة بعد قليل.";
    if (error.status === 0) return "تعذّر الوصول إلى خدمة CityMind. تحقق من الاتصال ثم أعد المحاولة.";
    return error.message;
  }
  return "تعذّر تحميل البيانات من خدمة CityMind. أعد المحاولة.";
}

/**
 * Load data from the API with explicit loading / error / ready states.
 *
 * There is deliberately no offline sample data: a municipal operator must never see
 * invented figures presented as live city data. When the API cannot answer, the UI
 * says so and offers a retry.
 */
export function useApiResource<T>(loader: () => Promise<T>, dependencies: readonly unknown[] = []): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (hasLoadedRef.current) setIsReloading(true);

    loaderRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
        setErrorStatus(null);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(apiErrorMessage(caught));
        setErrorStatus(caught instanceof ApiClientError ? caught.status ?? null : null);
        setStatus("error");
      })
      .finally(() => {
        if (!active) return;
        hasLoadedRef.current = true;
        setIsReloading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...dependencies]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, status, error, errorStatus, reload, isReloading };
}
