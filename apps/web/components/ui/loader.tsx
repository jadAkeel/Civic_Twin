export function Loader({ label = "Loading CityMind Tripoli" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
      <span className="h-3 w-3 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
      <span>{label}</span>
    </div>
  );
}
