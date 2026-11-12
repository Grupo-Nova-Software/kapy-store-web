"use client";

import { useState } from "react";
import { Camera, Copy, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { compareSizes, isOneSizeLabel } from "@/lib/inventory";
import { ImageUploadError, uploadProductImage } from "@/lib/admin/image-upload";
import { randomSuffix } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { StockStepper } from "@/components/admin/stock-stepper";
import { ConfirmButton } from "@/components/admin/confirm-button";

export interface SizeDraft {
  key: string;
  size: string;
  stock: number;
}

export interface ColorDraft {
  /** Stable React key (new colors have no id yet). */
  key: string;
  id?: string;
  colorName: string;
  hexColor: string;
  /** Public Storage URL once uploaded ("" when missing). */
  imageUrl: string;
  /** Local object URL shown immediately while the upload runs. */
  preview: string | null;
  uploading: boolean;
  uploadError: string | null;
  /** "Talle único" (headphones, accessories) vs. stock per size. */
  oneSize: boolean;
  oneSizeStock: number;
  sizes: SizeDraft[];
}

export const newDraftKey = () => `d-${randomSuffix(10)}`;

const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: "Negro", hex: "#18181B" },
  { name: "Blanco", hex: "#FAFAFA" },
  { name: "Gris", hex: "#A1A1AA" },
  { name: "Beige", hex: "#E7D7B8" },
  { name: "Marrón", hex: "#7C4A2D" },
  { name: "Rojo", hex: "#DC2626" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Amarillo", hex: "#EAB308" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Azul marino", hex: "#1E3A8A" },
  { name: "Rosa", hex: "#F9A8D4" },
  { name: "Violeta", hex: "#8B5CF6" },
];

const PRESET_NAMES = new Set(PRESET_COLORS.map((p) => p.name.toLowerCase()));

/**
 * True when the name was filled in by a preset tone (or is empty), so picking
 * another tone may replace it. Names the owner typed ("Chicago") are kept.
 */
const isAutoColorName = (name: string) => !name.trim() || PRESET_NAMES.has(name.trim().toLowerCase());

const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Closest preset name for a custom tone picked with the color wheel. */
function nearestPresetName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  let best = PRESET_COLORS[0];
  let bestDistance = Infinity;
  for (const p of PRESET_COLORS) {
    const [pr, pg, pb] = hexToRgb(p.hex);
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < bestDistance) [best, bestDistance] = [p, distance];
  }
  return best.name;
}

const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function presetSizesFor(categorySlug: string): string[] {
  if (categorySlug === "ropa") return CLOTHING_SIZES;
  if (categorySlug === "calzados") return SHOE_SIZES;
  return [...CLOTHING_SIZES, ...SHOE_SIZES];
}

interface ColorEditorProps {
  index: number;
  color: ColorDraft;
  /** Previous color, to copy its size list. */
  previous?: ColorDraft;
  categorySlug: string;
  onChange: (patch: Partial<ColorDraft> | ((current: ColorDraft) => Partial<ColorDraft>)) => void;
  onRemove: () => void;
}

export function ColorEditor({ index, color, previous, categorySlug, onChange, onRemove }: ColorEditorProps) {
  const [customSize, setCustomSize] = useState("");
  const photo = color.preview ?? color.imageUrl;
  const total = color.oneSize ? color.oneSizeStock : color.sizes.reduce((s, x) => s + x.stock, 0);
  const presetSizes = presetSizesFor(categorySlug).filter(
    (p) => !color.sizes.some((s) => s.size.toLowerCase() === p.toLowerCase()),
  );

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onChange({ preview, uploading: true, uploadError: null });
    try {
      const url = await uploadProductImage(file);
      onChange({ imageUrl: url, uploading: false });
    } catch (err) {
      const message =
        err instanceof ImageUploadError ? err.message : "No se pudo subir la foto. Revisá tu conexión.";
      onChange({ preview: null, uploading: false, uploadError: message });
      URL.revokeObjectURL(preview);
    }
  };

  const addSize = (raw: string) => {
    const size = raw.trim().toUpperCase().slice(0, 12);
    if (!size || isOneSizeLabel(size)) return;
    onChange((c) =>
      c.sizes.some((s) => s.size.toLowerCase() === size.toLowerCase())
        ? {}
        : {
            sizes: [...c.sizes, { key: newDraftKey(), size, stock: 1 }].sort((a, b) =>
              compareSizes(a.size, b.size),
            ),
          },
    );
  };

  const setSizeStock = (key: string, stock: number) =>
    onChange((c) => ({ sizes: c.sizes.map((s) => (s.key === key ? { ...s, stock } : s)) }));

  const removeSize = (key: string) => onChange((c) => ({ sizes: c.sizes.filter((s) => s.key !== key) }));

  const copyPreviousSizes = () => {
    if (!previous) return;
    onChange({
      oneSize: previous.oneSize,
      oneSizeStock: previous.oneSizeStock,
      sizes: previous.sizes.map((s) => ({ ...s, key: newDraftKey() })),
    });
  };

  return (
    <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <span
          aria-hidden
          className="size-7 shrink-0 rounded-full border border-black/10 dark:border-white/20"
          style={{ backgroundColor: color.hexColor }}
        />
        <h3 className="min-w-0 flex-1 truncate font-bold">
          {color.colorName || `Color ${index + 1}`}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {total} {total === 1 ? "unidad" : "unidades"}
          </span>
        </h3>
        <ConfirmButton
          onConfirm={onRemove}
          confirmLabel="Quitar"
          aria-label={`Quitar color ${color.colorName || index + 1}`}
          className="h-10 min-w-10 px-3"
        >
          <Trash2 className="size-4" aria-hidden />
        </ConfirmButton>
      </header>

      <div className="space-y-5 p-4">
        {/* Photo */}
        <div>
          <label
            className={cn(
              "relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 transition active:scale-[0.99] dark:bg-zinc-800 dark:ring-zinc-700",
              !photo && "border-2 border-dashed border-zinc-300 ring-0 dark:border-zinc-600",
            )}
          >
            {photo ? (
              <>
                {/* Plain <img>: previews are local blob: URLs that next/image can't optimize. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Foto ${color.colorName}`} className="absolute inset-0 size-full object-cover" />
                <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                  <Camera className="size-4" aria-hidden />
                  Cambiar foto
                </span>
              </>
            ) : (
              <>
                <ImagePlus className="size-10" aria-hidden />
                <span className="text-sm font-semibold">Subir foto de este color</span>
                <span className="text-xs">Galería o cámara</span>
              </>
            )}
            {color.uploading && (
              <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-zinc-900/60">
                <span className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Subiendo…
                </span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={color.uploading}
              onChange={(e) => {
                void pickPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {color.uploadError && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              {color.uploadError}
            </p>
          )}
        </div>

        {/* Name + hex */}
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-semibold">Nombre del color</span>
              <input
                value={color.colorName}
                onChange={(e) => onChange({ colorName: e.target.value })}
                maxLength={40}
                placeholder="Ej: Negro, Chicago, Verde oliva"
                className="h-12 w-full rounded-2xl bg-zinc-50 px-4 text-base ring-1 ring-zinc-200 outline-none text-zinc-900 focus:bg-white focus:ring-2 focus:ring-sky-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800 dark:focus:bg-zinc-900"
              />
            </label>
            <label className="relative block size-12 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700">
              <span className="sr-only">Elegir tono exacto</span>
              <span className="absolute inset-0" style={{ backgroundColor: color.hexColor }} aria-hidden />
              <input
                type="color"
                value={color.hexColor.toLowerCase()}
                onChange={(e) => {
                  const hex = e.target.value.toUpperCase();
                  onChange((c) => ({
                    hexColor: hex,
                    colorName: isAutoColorName(c.colorName) ? nearestPresetName(hex) : c.colorName,
                  }));
                }}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
            <div className="flex w-max gap-2 py-1">
              {PRESET_COLORS.map((p) => {
                const active = p.hex.toLowerCase() === color.hexColor.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    title={p.name}
                    aria-label={`Tono ${p.name}`}
                    aria-pressed={active}
                    onClick={() =>
                      onChange((c) => ({
                        hexColor: p.hex,
                        // Follow the tone unless the owner typed a custom name.
                        colorName: isAutoColorName(c.colorName) ? p.name : c.colorName,
                      }))
                    }
                    className={cn(
                      "size-10 shrink-0 rounded-full border border-black/10 ring-offset-2 ring-offset-white transition active:scale-90 dark:border-white/20 dark:ring-offset-zinc-900",
                      active ? "ring-2 ring-sky-600" : "",
                    )}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Talles y stock</span>
            {previous && (
              <button
                type="button"
                onClick={copyPreviousSizes}
                className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
              >
                <Copy className="size-3.5" aria-hidden />
                Copiar de {previous.colorName || "anterior"}
              </button>
            )}
          </div>

          <div role="radiogroup" aria-label="Tipo de talle" className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {[
              { oneSize: false, label: "Por talle" },
              { oneSize: true, label: "Talle único" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={color.oneSize === opt.oneSize}
                onClick={() => onChange({ oneSize: opt.oneSize })}
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold transition",
                  color.oneSize === opt.oneSize
                    ? "bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white"
                    : "text-zinc-500",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {color.oneSize ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950">
              <span className="text-sm">
                <span className="block font-semibold">Stock</span>
                <span className="text-xs text-zinc-500">Talle único</span>
              </span>
              <StockStepper
                label={`Stock ${color.colorName || `color ${index + 1}`}`}
                value={color.oneSizeStock}
                onChange={(v) => onChange({ oneSizeStock: v })}
              />
            </div>
          ) : (
            <>
              {color.sizes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  Tocá los talles que tenés en este color.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50 dark:divide-zinc-800 dark:bg-zinc-950">
                  {color.sizes.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 py-2 pr-2 pl-4">
                      <span className="min-w-12 text-lg font-black tabular-nums">{s.size}</span>
                      {s.stock === 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                          Agotado
                        </span>
                      )}
                      <span className="ml-auto" />
                      <StockStepper
                        label={`Stock talle ${s.size}`}
                        value={s.stock}
                        onChange={(v) => setSizeStock(s.key, v)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSize(s.key)}
                        aria-label={`Quitar talle ${s.size}`}
                        className="grid size-10 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <X className="size-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {presetSizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presetSizes.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => addSize(p)}
                      aria-label={`Agregar talle ${p}`}
                      className="flex h-11 min-w-14 items-center justify-center gap-1 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-zinc-200 transition active:scale-95 dark:bg-zinc-800 dark:ring-zinc-700"
                    >
                      <Plus className="size-3.5 text-sky-600" aria-hidden />
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSize(customSize);
                      setCustomSize("");
                    }
                  }}
                  maxLength={12}
                  placeholder="Otro talle (ej: 36.5, XL)"
                  aria-label="Otro talle"
                  className="h-12 min-w-0 flex-1 rounded-2xl bg-zinc-50 px-4 text-base ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-sky-600 dark:bg-zinc-950 dark:ring-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    addSize(customSize);
                    setCustomSize("");
                  }}
                  disabled={!customSize.trim()}
                  className="h-12 shrink-0 rounded-2xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
                >
                  Agregar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
