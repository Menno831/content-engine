// Directe skeleton bij elke navigatie — de pagina voelt meteen responsief
// terwijl de server de echte data ophaalt.
export default function PlatformLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
      <div className="h-7 w-64 rounded bg-white/[0.08] mb-2" />
      <div className="h-3 w-96 max-w-full rounded bg-white/[0.05] mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
      </div>
    </div>
  );
}
