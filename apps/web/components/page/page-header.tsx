import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-emerald-700">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{title}</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
      </div>
      {status ? <Badge tone="green">{status}</Badge> : null}
    </header>
  );
}
