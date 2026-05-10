// loading.tsx — Suspense fallback for /dispatches/[id] while server fetch completes.
export default function DispatchLoading() {
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-5 gap-4 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-stone-800" />
        <div className="h-4 w-2 rounded bg-stone-800" />
        <div className="h-4 w-32 rounded bg-stone-800" />
      </div>
      {/* Title skeleton */}
      <div className="h-7 w-2/3 rounded bg-stone-800" />
      {/* Badge row */}
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-stone-800" />
        <div className="h-5 w-24 rounded bg-stone-800" />
      </div>
      {/* Body skeleton */}
      <div className="h-20 rounded-lg bg-stone-800/60" />
      {/* Tabs skeleton */}
      <div className="h-10 rounded bg-stone-800/40" />
      <div className="flex-1 rounded bg-stone-800/20" />
    </div>
  );
}
