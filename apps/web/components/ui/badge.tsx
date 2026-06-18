import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "green" | "blue" | "amber" | "rose";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
