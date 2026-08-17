import { cn } from "@/lib/cn";

type ProgressTone = "green" | "blue" | "amber" | "rose";

const fillClasses: Record<ProgressTone, string> = {
  green: "bg-teal-600",
  blue: "bg-sky-600",
  amber: "bg-orange-500",
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-[width] duration-500", fillClasses[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}
