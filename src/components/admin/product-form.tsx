"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import type { Category, Product } from "@/types/store";
import { BADGE_OPTIONS, type ProductInput } from "@/lib/admin/types";
import { isOneSizeVariant, ONE_SIZE_LABEL, sortSizeStocks } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { toast } from "@/store/admin-toast-store";
import { ColorEditor, newDraftKey, type ColorDraft } from "@/components/admin/color-editor";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PriceInput } from "@/components/admin/price-input";

interface ProductFormProps {
  categories: Category[];
  /** Omitted when creating a new product. */
  product?: Product;
}

/** Categories whose products usually have no sizes. */
const ONE_SIZE_CATEGORIES = new Set(["auriculares", "accesorios"]);

function draftsFrom(product: Product | undefined): ColorDraft[] {
  if (!product) return [];
  return product.variants.map((v) => {
    const oneSize = isOneSizeVariant(v);
    return {
      key: newDraftKey(),
      id: v.id,
      colorName: v.colorName,
      hexColor: v.hexColor,
      imageUrl: v.imageUrl,
      preview: null,
      uploading: false,
      uploadError: null,
      oneSize,
      oneSizeStock: oneSize ? (v.sizeStocks[0]?.stock ?? 0) : 0,
      sizes: oneSize
        ? []
        : sortSizeStocks(v.sizeStocks).map((s) => ({ key: newDraftKey(), size: s.size, stock: s.stock })),
    };
  });
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState<number | null>(product?.price ?? null);
  const [compareAt, setCompareAt] = useState<number | null>(product?.compareAtPrice ?? null);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [badge, setBadge] = useState<string | null>(product?.badge ?? null);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [colors, setColors] = useState<ColorDraft[]>(() => draftsFrom(product));

  const categorySlug = categories.find((c) => c.id === categoryId)?.slug ?? "";
  const uploading = colors.some((c) => c.uploading);
  const busy = saving || deleting;

  const updateColor = (key: string, patch: Partial<ColorDraft> | ((c: ColorDraft) => Partial<ColorDraft>)) =>
    setColors((list) =>
      list.map((c) => (c.key === key ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)),
    );

  const addColor = () =>
    setColors((list) => [
      ...list,
      {
        key: newDraftKey(),
        colorName: "",
        hexColor: "#18181B",
        imageUrl: "",
        preview: null,
        uploading: false,
        uploadError: null,
        oneSize: ONE_SIZE_CATEGORIES.has(categorySlug),
        oneSizeStock: 1,
        sizes: [],
      },
    ]);

  const toInput = (): ProductInput => ({
    id: product?.id,
    name,
    brand,
    description,
    price: price ?? 0,
    compareAtPrice: compareAt,
    categoryId,
    badge,
    isActive,
    colors: colors.map((c) => ({
      id: c.id,
      colorName: c.colorName,
      hexColor: c.hexColor,
      imageUrl: c.imageUrl,
      sizeStocks: c.oneSize
        ? [{ size: ONE_SIZE_LABEL, stock: c.oneSizeStock }]
        : c.sizes.map(({ size, stock }) => ({ size, stock })),
    })),
  });

  const save = () => {
    if (uploading) {
      setError("Esperá a que terminen de subir las fotos.");
      return;
    }
    setError(null);
    startSaving(async () => {
      const result = await saveProduct(toInput());
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(product ? "Cambios guardados" : "Producto creado");
      router.push("/admin");
    });
  };

  const remove = () =>
    startDeleting(async () => {
      if (!product) return;
      const result = await deleteProduct(product.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Producto eliminado");
      router.push("/admin");
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          aria-label="Volver a productos"
          className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="truncate text-2xl font-black tracking-tight">
          {product ? "Editar producto" : "Nuevo producto"}
        </h1>
      </div>

      <Section title="Información">
        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="Ej: Air Runner 90"
            className={inputClass}
          />
        </Field>
        <Field label="Marca" hint="Opcional">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={60}
            placeholder="Ej: Kapy Kicks"
            className={inputClass}
          />
        </Field>
        <Field label="Descripción">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Materiales, para qué sirve, cómo calza…"
            className={cn(inputClass, "h-auto py-3 leading-relaxed")}
          />
        </Field>
      </Section>

      <Section title="Precio">
        <Field label="Precio (Gs.)">
          <PriceInput value={price} onChange={setPrice} required placeholder="350.000" />
        </Field>
        <Field label="Precio anterior (Gs.)" hint="Opcional: se muestra tachado como descuento">
          <PriceInput value={compareAt} onChange={setCompareAt} placeholder="Sin descuento" />
        </Field>
      </Section>

      <Section title="Categoría">
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Primero creá una categoría en{" "}
            <Link href="/admin/categorias" className="font-semibold text-sky-600 underline">
              Categorías
            </Link>
            .
          </p>
        ) : (
          <ChipGroup
            label="Categoría"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={(v) => setCategoryId(v ?? categoryId)}
          />
        )}
      </Section>

      <Section title="Etiqueta">
        <ChipGroup
          label="Etiqueta"
          options={[{ value: null, label: "Ninguna" }, ...BADGE_OPTIONS.map((b) => ({ value: b, label: b }))]}
          value={badge}
          onChange={setBadge}
        />
      </Section>

      <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-3xl bg-white px-4 py-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <span>
          <span className="block font-bold">Visible en la tienda</span>
          <span className="text-sm text-zinc-500">
            {isActive ? "Los clientes lo ven en el catálogo" : "Oculto: solo lo ves vos"}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-8 w-14 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-600 peer-focus-visible:ring-offset-2 after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6 dark:bg-zinc-700"
        />
      </label>

      <section aria-labelledby="colors-title" className="space-y-3">
        <div className="px-1">
          <h2 id="colors-title" className="text-lg font-black tracking-tight">
            Colores y talles
          </h2>
          <p className="text-sm text-zinc-500">
            Cada color tiene su foto y su propio stock por talle.
          </p>
        </div>

        {colors.map((color, index) => (
          <ColorEditor
            key={color.key}
            index={index}
            color={color}
            previous={index > 0 ? colors[index - 1] : undefined}
            categorySlug={categorySlug}
            onChange={(patch) => updateColor(color.key, patch)}
            onRemove={() => setColors((list) => list.filter((c) => c.key !== color.key))}
          />
        ))}

        <button
          type="button"
          onClick={addColor}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sky-300 text-base font-bold text-sky-700 transition active:scale-[0.99] dark:border-sky-800 dark:text-sky-400"
        >
          <Plus className="size-6" aria-hidden />
          Agregar color
        </button>
      </section>

      {product && (
        <div className="pt-4">
          <ConfirmButton
            onConfirm={remove}
            disabled={busy}
            confirmLabel="Sí, borrar para siempre"
            className="h-14 w-full"
          >
            <Trash2 className="size-5" aria-hidden />
            {deleting ? "Borrando…" : "Borrar producto"}
          </ConfirmButton>
        </div>
      )}

      {/* Spacer so the sticky save bar never covers the last field. */}
      <div className="h-24" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p role="alert" className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || uploading || categories.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-base font-bold text-white shadow-lg shadow-sky-600/25 transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving || uploading ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-5" aria-hidden />
            )}
            {saving ? "Guardando…" : uploading ? "Subiendo fotos…" : "Guardar producto"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Small form primitives ───────────────────────────────────────────────────

export const inputClass =
  "h-12 w-full rounded-2xl bg-zinc-50 px-4 text-base ring-1 ring-zinc-200 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-sky-600 dark:bg-zinc-950 dark:ring-zinc-800 dark:focus:bg-zinc-950";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="text-sm font-bold tracking-wider text-zinc-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold">
        {label}
        {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ChipGroup<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value ?? "none"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-11 rounded-full px-4 text-sm font-semibold transition active:scale-95",
              active
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
