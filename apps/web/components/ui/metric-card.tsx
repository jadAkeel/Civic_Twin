import { cn } from "@/lib/cn";
import type { CityIconName } from "@/components/ui/city-icon";
import { CityIcon } from "@/components/ui/city-icon";

type MetricTone = "green" | "blue" | "amber" | "rose";

const toneClasses: Record<MetricTone, string> = {
  green: "border-teal-200 bg-teal-50 text-teal-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
};

export function MetricCard({
  label,
  value,
  detail,
  tone,
  badgeLabel,
  icon,
  integrated = false,
}: {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  badgeLabel?: string;
  icon?: CityIconName;
  integrated?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative min-w-0 bg-white",
        integrated
          ? "px-4 py-3.5 sm:px-5"
          : "rounded-2xl border border-slate-200 p-5 shadow-[0_8px_30px_rgba(15,35,55,0.04)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full border", toneClasses[tone])}>
              <CityIcon name={icon} />
            </span>
          ) : null}
          <p className="text-sm font-semibold text-slate-600">{label}</p>
        </div>
        {badgeLabel ? (
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", toneClasses[tone])}>
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <p className={cn("text-3xl font-bold tracking-tight text-slate-950", integrated ? "mt-2" : "mt-4")}>{value}</p>
      <p className={cn("mt-2 text-xs leading-5 text-slate-500", integrated && "hidden")}>{detail}</p>
    </section>
  );
}
