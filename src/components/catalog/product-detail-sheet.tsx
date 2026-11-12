"use client";

import { useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { ShoppingBag, Truck } from "lucide-react";
import type { Product, ProductVariant } from "@/types/store";
import { cartKey, cn, formatGs, variantPrice } from "@/lib/utils";
import { isOneSizeVariant, ONE_SIZE_LABEL, sizeStockOf } from "@/lib/inventory";
import { orderToWhatsAppUrl } from "@/lib/whatsapp";
import { lineQuantity, useCartStore } from "@/store/cart-store";
import { Sheet } from "@/components/ui/sheet";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ColorSwatches } from "@/components/catalog/color-swatches";
import { SizeSelector } from "@/components/catalog/size-selector";
import { StockLabel } from "@/components/catalog/stock-label";

export interface ProductSelection {
  product: Product;
  variant: ProductVariant;
}

interface ProductDetailSheetProps {
  selection: ProductSelection | null;
  onClose: () => void;
}

export function ProductDetailSheet({ selection, onClose }: ProductDetailSheetProps) {
  return (
    <Sheet open={selection !== null} onClose={onClose} label={selection?.product.name ?? "Producto"}>
      {selection && (
        <ProductDetail
          // Fresh state (variant, size, photo, qty) every time a product is opened.
          key={`${selection.product.id}:${selection.variant.id}`}
          product={selection.product}
          initialVariant={selection.variant}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function ProductDetail({
  product,
  initialVariant,
  onClose,
}: {
  product: Product;
  initialVariant: ProductVariant;
  onClose: () => void;
}) {
  const [variant, setVariant] = useState(initialVariant);
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  /** Times the user tried to continue without a size (re-triggers the shake). */
  const [missingSizeAttempts, setMissingSizeAttempts] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const sizesRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const cartItems = useCartStore((s) => s.items);

  const needsSize = !isOneSizeVariant(variant);
  /**
   * Sizes offered in THIS color with their REAL stock. The cart does not
   * reserve units: stock only goes down when the admin changes it.
   */
  const sizeOptions = variant.sizeStocks;
  const colorAvailable = sizeOptions.reduce((sum, o) => sum + o.stock, 0);
  // One-size colors need no choice; a picked size that this color lacks is dropped.
  const size = needsSize
    ? sizeOptions.some((o) => o.size === pickedSize && o.stock > 0)
      ? pickedSize
      : null
    : (variant.sizeStocks[0]?.size ?? ONE_SIZE_LABEL);
  const sizeMissing = size === null;
  const photos = [variant.imageUrl, ...variant.gallery];
  const price = variantPrice(product, variant);
  const inCart = size === null ? 0 : lineQuantity(cartItems, cartKey(product.id, variant.id, size));
  const available = size === null ? colorAvailable : sizeStockOf(variant, size);
  const qty = size === null ? 1 : Math.min(quantity, Math.max(available, 1));
  const canBuy = available > 0;

  const selectVariant = (v: ProductVariant) => {
    setVariant(v);
    setPhotoIndex(0);
    setQuantity(1);
  };

  const selectSize = (s: string) => {
    setPickedSize(s);
    setQuantity(1);
  };

  /** Returns false (and asks for the size) when one is required but missing. */
  const ensureSize = (): boolean => {
    if (!sizeMissing) return true;
    setMissingSizeAttempts((n) => n + 1);
    sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    sizesRef.current?.focus({ preventScroll: true });
    return false;
  };

  const addToCart = () => {
    if (!ensureSize() || size === null) return;
    addItem(
      {
        key: cartKey(product.id, variant.id, size),
        productId: product.id,
        variantId: variant.id,
        size,
        name: product.name,
        colorName: variant.colorName,
        hexColor: variant.hexColor,
        imageUrl: variant.imageUrl,
        unitPrice: price,
        maxStock: sizeStockOf(variant, size),
      },
      qty,
    );
    // Even if the line was already at the stock limit, show the cart.
    onClose();
    openCart();
  };

  const onWhatsAppClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!ensureSize()) e.preventDefault();
  };

  const whatsappUrl = orderToWhatsAppUrl([
    {
      name: product.name,
      colorName: variant.colorName,
      size,
      quantity: qty,
      unitPrice: price,
    },
  ]);

  return (
    <div className="grid min-h-0 overflow-y-auto md:grid-cols-2 md:overflow-hidden">
      {/* Gallery */}
      <div className="p-4 pb-0 md:p-6 md:pr-3">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <Image
            key={photos[photoIndex]}
            src={photos[photoIndex]}
            alt={`${product.name} — ${variant.colorName}`}
            fill
            sizes="(min-width: 768px) 440px, 100vw"
            priority
            className="animate-fade-in object-cover"
          />
        </div>
        {photos.length > 1 && (
          <div className="mt-3 flex gap-2">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhotoIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={cn(
                  "relative size-16 overflow-hidden rounded-xl bg-zinc-100 ring-offset-2 transition dark:bg-zinc-800 dark:ring-offset-zinc-900",
                  i === photoIndex ? "ring-2 ring-sky-600" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:overflow-y-auto md:p-6 md:pl-3">
        <div className="pr-10">
          <p className="text-xs font-semibold tracking-wider text-sky-600 uppercase">{product.brand}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight uppercase">{product.name}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">{formatGs(price)}</span>
            {product.compareAtPrice && product.compareAtPrice > price && (
              <span className="text-sm text-zinc-400 line-through">
                {formatGs(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{product.description}</p>

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-sm">
              <span className="text-zinc-500">Color: </span>
              <span className="font-semibold">{variant.colorName}</span>
            </p>
            <StockLabel stock={size === null ? variant.stock : sizeStockOf(variant, size)} />
          </div>
          <ColorSwatches
            variants={product.variants}
            activeId={variant.id}
            onSelect={selectVariant}
            size="lg"
          />
        </div>

        {needsSize ? (
          <div>
            <p className="mb-2.5 text-sm">
              <span className="text-zinc-500">Talle (EUR): </span>
              <span className={cn("font-semibold", !size && "text-zinc-400")}>
                {size ?? "Elegí uno"}
              </span>
            </p>
            {colorAvailable > 0 ? (
              <SizeSelector
                key={missingSizeAttempts}
                ref={sizesRef}
                options={sizeOptions}
                value={size}
                onChange={selectSize}
                invalid={missingSizeAttempts > 0 && sizeMissing}
              />
            ) : (
              <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-800">
                Este color está agotado en todos los talles. Probá con otro color.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm">
            <span className="text-zinc-500">Talle: </span>
            <span className="font-semibold">{size}</span>
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Cantidad</p>
            <p className="text-xs text-zinc-500">
              {canBuy && size === null
                ? "Elegí un talle para ver la disponibilidad"
                : canBuy
                ? `${available} disponible${available === 1 ? "" : "s"}${needsSize ? ` en talle ${size}` : ""}${inCart ? ` · ${inCart} en tu carrito` : ""}`
                : "Sin unidades disponibles"}
            </p>
          </div>
          <QuantityStepper
            value={canBuy ? qty : 0}
            min={1}
            max={size === null ? 1 : available}
            onDecrement={() => setQuantity(Math.max(qty - 1, 1))}
            onIncrement={() => setQuantity(Math.min(qty + 1, available))}
          />
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={addToCart}
            disabled={!canBuy}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            <ShoppingBag className="size-5" />
            Agregar al carrito · {formatGs(price * (canBuy ? qty : 1))}
          </button>
          <a
            href={canBuy ? whatsappUrl : undefined}
            onClick={onWhatsAppClick}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canBuy}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 font-bold text-white transition hover:bg-emerald-600 active:scale-[0.98]",
              !canBuy && "pointer-events-none opacity-40",
            )}
          >
            <WhatsAppIcon className="size-5" />
            Comprar por WhatsApp
          </a>
          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Truck className="size-3.5" aria-hidden />
            Envío a coordinar · Pago contra entrega o transferencia
          </p>
        </div>
      </div>
    </div>
  );
}
