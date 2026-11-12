/** Loading placeholder that mirrors the catalog layout (title, chips, grid). */
export function CatalogSkeleton({ cards = 8 }: { cards?: number }) {
  const block = "animate-shimmer rounded-full bg-zinc-200 dark:bg-zinc-800";

  return (
    <section
      aria-busy="true"
      aria-label="Cargando catálogo"
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6"
    >
      <div className="mb-4 space-y-2">
        <div className={`${block} h-7 w-36`} />
        <div className={`${block} h-4 w-24`} />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {[88, 116, 132, 124].map((w) => (
          <div key={w} className={`${block} h-10 shrink-0`} style={{ width: w }} />
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="aspect-square animate-shimmer bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2.5 p-3 sm:p-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <div key={d} className={`${block} size-5`} />
                ))}
              </div>
              <div className={`${block} h-3 w-16`} />
              <div className={`${block} h-4 w-3/4`} />
              <div className={`${block} h-3 w-20`} />
              <div className="flex items-end justify-between pt-1">
                <div className={`${block} h-5 w-24`} />
                <div className={`${block} size-10`} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Cargando productos…</span>
    </section>
  );
}
