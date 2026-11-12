/** Supabase project URL + publishable (anon) key, shared by every client. */
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    );
  }
  return { url, anonKey };
}

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Public URL prefix of the images bucket, to recognise files we own. */
export function productImagesPublicPrefix(): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
}
