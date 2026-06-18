import { cn } from "@/lib/cn";

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-md border border-slate-200 bg-white shadow-sm", className)}>
      <header className="flex min-w-0 flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase text-emerald-700">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="min-w-0 p-5">{children}</div>
    </section>
  );
}
