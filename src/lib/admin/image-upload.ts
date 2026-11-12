"use client";

import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/env";
import { randomSuffix } from "@/lib/slug";

/** Phone photos can be huge; anything bigger is almost surely not a photo. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Bucket limit is 5 MB; compressed photos land around 150–400 KB. */
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1400;

export class ImageUploadError extends Error {}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Validates, resizes (max 1400px) and re-encodes a photo as WebP (JPEG where
 * WebP encoding is unsupported). Also strips EXIF metadata (GPS, device…).
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("El archivo no es una imagen.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageUploadError("La foto pesa más de 25 MB. Probá con otra.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageUploadError("No pudimos leer esa foto (¿formato HEIC?). Probá con JPG o PNG.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageUploadError("Tu navegador no permite procesar la foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  // Older Safari silently falls back to PNG: use JPEG instead.
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!blob) throw new ImageUploadError("No se pudo comprimir la foto.");
  if (blob.size > MAX_OUTPUT_BYTES) throw new ImageUploadError("La foto sigue siendo muy pesada.");
  return blob;
}

/** Compresses and uploads to the `product-images` bucket; returns the public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  // No crypto.randomUUID(): it is missing on plain-http LAN testing (phone → PC).
  const path = `products/${new Date().toISOString().slice(0, 7)}/${Date.now().toString(36)}-${randomSuffix(8)}.${ext}`;

  const storage = getSupabaseBrowser().storage.from(PRODUCT_IMAGES_BUCKET);
  const { error } = await storage.upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    const denied = /row-level security|unauthorized|403/i.test(error.message);
    throw new ImageUploadError(
      denied
        ? "Sin permiso para subir fotos: revisá que tu usuario sea admin."
        : `No se pudo subir la foto (${error.message}).`,
    );
  }
  return storage.getPublicUrl(path).data.publicUrl;
}
