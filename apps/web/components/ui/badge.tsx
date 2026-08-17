import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "green" | "blue" | "amber" | "rose";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  green: "border-teal-200 bg-teal-50 text-teal-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-orange-200 bg-orange-50 text-orange-800",
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
        "inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 text-xs font-bold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
