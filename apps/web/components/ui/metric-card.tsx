import { cn } from "@/lib/cn";

type MetricTone = "green" | "blue" | "amber" | "rose";

const toneClasses: Record<MetricTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
};

export function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", toneClasses[tone])}>
          تجريبي
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </section>
  );
}
