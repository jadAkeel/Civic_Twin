import { cn } from "@/lib/cn";

export function Tabs({
  items,
  active,
}: {
  items: string[];
  active: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "rounded-md border px-3 py-2 text-sm font-medium",
            item === active
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
