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
export async function compressImage(
  file: File,
  { maxSide = MAX_SIDE, keepTransparency = false }: { maxSide?: number; keepTransparency?: boolean } = {},
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("El archivo no es una imagen.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageUploadError("La foto pesa más de 25 MB. Probá con otra.");
  }

  const isSvg = file.type === "image/svg+xml";
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    // SVG icons can't go through createImageBitmap in every browser.
    bitmap =
      isSvg
        ? await loadImageElement(file)
        : await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageUploadError("No pudimos leer esa imagen (¿formato HEIC?). Probá con JPG o PNG.");
  }

  // Vectors are rasterized at full size (a 24px SVG would come out blurry).
  const fit = maxSide / Math.max(bitmap.width, bitmap.height);
  const scale = isSvg ? fit : Math.min(1, fit);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageUploadError("Tu navegador no permite procesar la foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  // Older Safari silently falls back to PNG: use JPEG (or PNG to keep the
  // transparent background of an icon) instead.
  if (!blob || blob.type !== "image/webp") {
    blob = keepTransparency ? await canvasToBlob(canvas, "image/png", 1) : await canvasToBlob(canvas, "image/jpeg", 0.85);
  }
  if (!blob) throw new ImageUploadError("No se pudo comprimir la foto.");
  if (blob.size > MAX_OUTPUT_BYTES) throw new ImageUploadError("La foto sigue siendo muy pesada.");
  return blob;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // SVGs without width/height report 0: draw them at a fixed size.
      if (!img.naturalWidth || !img.naturalHeight) [img.width, img.height] = [256, 256];
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

const EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

/** Compresses and uploads to the `product-images` bucket; returns the public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  // No crypto.randomUUID(): it is missing on plain-http LAN testing (phone → PC).
  const path = `products/${new Date().toISOString().slice(0, 7)}/${Date.now().toString(36)}-${randomSuffix(8)}.${EXT[blob.type]}`;
  return upload(path, blob);
}

/** Category icon: small (256px) with its transparent background kept. */
export async function uploadCategoryIcon(file: File): Promise<string> {
  const blob = await compressImage(file, { maxSide: 256, keepTransparency: true });
  return upload(`categories/${Date.now().toString(36)}-${randomSuffix(8)}.${EXT[blob.type]}`, blob);
}

async function upload(path: string, blob: Blob): Promise<string> {
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
        ? "Sin permiso para subir imágenes: revisá que tu usuario sea admin."
        : `No se pudo subir la imagen (${error.message}).`,
    );
  }
  return storage.getPublicUrl(path).data.publicUrl;
}
