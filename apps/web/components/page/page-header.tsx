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
    <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-4xl">
        <p className="sr-only">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.1rem] sm:leading-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>
      {status ? <Badge className="self-start lg:self-auto" tone="green">{status}</Badge> : null}
    </header>
  );
}
