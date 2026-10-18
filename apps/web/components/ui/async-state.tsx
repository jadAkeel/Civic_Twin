"use client";

import { Badge } from "@/components/ui/badge";
import { CityIcon } from "@/components/ui/city-icon";
import { Loader } from "@/components/ui/loader";
import type { ResourceStatus } from "@/lib/use-api-resource";

export function LoadingState({ label = "جارٍ تحميل البيانات من خدمة CityMind" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
      <Loader label={label} />
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  isRetrying = false,
}: {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center"
      role="alert"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-100 text-rose-700">
        <CityIcon name="warning" className="h-5 w-5" />
      </span>
      <p className="max-w-md text-sm font-semibold leading-6 text-rose-950">{message}</p>
      <p className="max-w-md text-xs leading-5 text-rose-800">
        لم تُعرض أي أرقام تقديرية بدل البيانات الحقيقية. أعد المحاولة عندما تعود الخدمة.
      </p>
      {onRetry ? (
        <button className="city-secondary-button" type="button" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "جارٍ إعادة المحاولة" : "إعادة المحاولة"}
        </button>
      ) : null}
    </div>
  );
}

/** Small connection indicator shown in a panel header. */
export function SourceBadge({ status, isReloading = false }: { status: ResourceStatus; isReloading?: boolean }) {
  if (isReloading || status === "loading") return <Badge tone="blue">جارٍ التحميل</Badge>;
  if (status === "error") return <Badge tone="rose">الخدمة غير متاحة</Badge>;
  return <Badge tone="green">مصدر متصل</Badge>;
}

/**
 * Render children only when live data is available; otherwise show the matching
 * loading or error state. Keeps every workspace honest about what it is showing.
 */
export function AsyncSection<T>({
  resource,
  children,
  loadingLabel,
}: {
  resource: { data: T | null; status: ResourceStatus; error: string | null; reload: () => void; isReloading: boolean };
  children: (data: T) => React.ReactNode;
  loadingLabel?: string;
}) {
  if (resource.status === "loading") return <LoadingState label={loadingLabel} />;
  if (resource.status === "error" || resource.data === null) {
    return (
      <ErrorState
        message={resource.error ?? "تعذّر تحميل البيانات."}
        onRetry={resource.reload}
        isRetrying={resource.isReloading}
      />
    );
  }
  return <>{children(resource.data)}</>;
}
