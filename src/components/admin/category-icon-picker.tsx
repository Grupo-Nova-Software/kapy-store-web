"use client";

import { useRef, useState } from "react";
import { ImageUp, LoaderCircle } from "lucide-react";
import { CATEGORY_ICONS, isUploadedIcon, type CategoryIconKey } from "@/lib/category-icons";
import { ImageUploadError, uploadCategoryIcon } from "@/lib/admin/image-upload";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/catalog/category-icon";

const KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

interface CategoryIconPickerProps {
  /** Current icon (key or uploaded URL); null → default by slug. */
  value: string | null;
  onChange: (icon: string) => void;
  disabled?: boolean;
}

/** Grid of built-in icons plus "upload your own" (PNG/SVG/WebP, kept transparent). */
export function CategoryIconPicker({ value, onChange, disabled }: CategoryIconPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploaded = value && isUploadedIcon(value) ? value : null;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadCategoryIcon(file));
    } catch (e) {
      setError(e instanceof ImageUploadError ? e.message : "No se pudo subir el ícono.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div role="radiogroup" aria-label="Ícono" className="grid grid-cols-6 gap-1.5">
        {KEYS.map((key) => {
          const { icon: Icon, label } = CATEGORY_ICONS[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              disabled={disabled}
              onClick={() => onChange(key)}
              className={cn(
                "grid aspect-square place-items-center rounded-xl transition active:scale-90 disabled:opacity-50",
                active
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60",
            uploaded
              ? "border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200",
          )}
        >
          {uploading ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : uploaded ? (
            <CategoryIcon category={{ icon: uploaded, slug: "" }} size={22} className="rounded" />
          ) : (
            <ImageUp className="size-5" aria-hidden />
          )}
          {uploading ? "Subiendo…" : uploaded ? "Tu ícono · cambiar" : "Subir mi ícono"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp,image/jpeg"
          className="sr-only"
          tabIndex={-1}
          aria-label="Subir ícono propio"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-zinc-500">
        Ideal: PNG o SVG cuadrado con fondo transparente. Se achica a 256 px.
      </p>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
