import { CreditCard, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Envíos a todo el país", text: "Asunción y Central en 24 h" },
  { icon: CreditCard, title: "Contra entrega o transferencia", text: "Pagás cuando recibís" },
  { icon: ShieldCheck, title: "Productos verificados", text: "Garantía Kapy en cada pedido" },
] as const;

export function TrustBar() {
  return (
    <section aria-label="Beneficios" className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 px-5 py-6 text-white sm:px-8 sm:py-8 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
        {/* Accent blobs inspired by the mascot colors */}
        <div aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-sky-600/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-red-600/30 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-bold tracking-[0.2em] text-sky-400 uppercase">Drop de temporada</p>
          <h1 className="mt-2 max-w-xl text-2xl font-black tracking-tight uppercase sm:text-4xl">
            Sneakers y audio para moverte por la ciudad
          </h1>

          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {ITEMS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Icon className="size-[18px] text-emerald-400" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-zinc-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
