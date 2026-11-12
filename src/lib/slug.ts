/** "Zapatillas Ñandú 2.0" → "zapatillas-nandu-2-0" (matches the DB slug check). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Short random suffix for slugs / SKUs: "k3f9". */
export function randomSuffix(length = 4): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
