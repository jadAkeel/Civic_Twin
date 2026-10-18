import { Loader } from "@/components/ui/loader";

export default function RouteLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <Loader />
    </div>
  );
}
