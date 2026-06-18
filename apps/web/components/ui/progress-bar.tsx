import { cn } from "@/lib/cn";

type ProgressTone = "green" | "blue" | "amber" | "rose";

const fillClasses: Record<ProgressTone, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

export function ProgressBar({
  value,
  tone = "green",
}: {
  value: number;
  tone?: ProgressTone;
}) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={cn("h-2 rounded-full", fillClasses[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}
