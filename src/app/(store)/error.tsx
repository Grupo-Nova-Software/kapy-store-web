"use client";

import Image from "next/image";
import { RotateCw } from "lucide-react";

/** Shown when the catalog can't be loaded (Supabase down, schema missing…). */
export default function CatalogError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Image src="/branding/logo.png" alt="" width={112} height={112} className="grayscale" />
      <h1 className="mt-5 text-xl font-black tracking-tight uppercase">No pudimos cargar el catálogo</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Kapy tuvo un problema conectándose con la tienda. Probá de nuevo en unos segundos.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        <RotateCw className="size-4" aria-hidden />
        Reintentar
      </button>
      {digest && <p className="mt-6 font-mono text-[11px] text-zinc-400">Código: {digest}</p>}
    </main>
  );
}
