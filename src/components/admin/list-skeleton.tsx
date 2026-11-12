export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const block = "animate-shimmer rounded-full bg-zinc-200 dark:bg-zinc-800";
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-3">
      <div className={`${block} h-7 w-40`} />
      <div className={`${block} h-12 w-full rounded-2xl`} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="size-16 shrink-0 animate-shimmer rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className={`${block} h-4 w-2/3`} />
            <div className={`${block} h-3 w-1/3`} />
          </div>
        </div>
      ))}
    </div>
  );
}
