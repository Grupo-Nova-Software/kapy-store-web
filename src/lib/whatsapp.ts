import { formatGs, ONE_SIZE_LABEL } from "@/lib/utils";
import type { Guaranies } from "@/types/store";

/** International format without "+" (595 = Paraguay). Configure in `.env.local`. */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "595981000000";

export interface OrderLine {
  name: string;
  colorName: string;
  /** `null` → one-size product, rendered as "Único". */
  size: string | null;
  quantity: number;
  unitPrice: Guaranies;
}

export function buildOrderMessage(lines: OrderLine[]): string {
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const items = lines.map(
    (l) =>
      `- ${l.quantity}x ${l.name} (Color: ${l.colorName}, Talle: ${l.size ?? ONE_SIZE_LABEL}) - ${formatGs(l.unitPrice * l.quantity)}`,
  );

  return [
    "Hola Kapy Store! Quiero realizar este pedido:",
    ...items,
    `Total: ${formatGs(total)}`,
    "¿Tienen disponibilidad para coordinar la entrega?",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string, phone = WHATSAPP_NUMBER): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function orderToWhatsAppUrl(lines: OrderLine[]): string {
  return buildWhatsAppUrl(buildOrderMessage(lines));
}
