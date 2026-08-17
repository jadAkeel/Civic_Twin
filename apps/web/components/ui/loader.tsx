export function Loader({ label = "جارٍ تحميل CityMind Tripoli" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-600" role="status">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-600" />
      </span>
      <span>{label}</span>
    </div>
  );
}
