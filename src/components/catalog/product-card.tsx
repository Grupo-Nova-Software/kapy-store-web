"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import type { Product, ProductVariant } from "@/types/store";
import { cartKey, cn, defaultVariant, formatGs, variantPrice } from "@/lib/utils";
import {
  isOneSizeVariant,
  isProductSoldOut,
  ONE_SIZE_LABEL,
  productHasSizes,
  productSizesInStock,
  sizeRangeLabel,
  sizeStockOf,
} from "@/lib/inventory";
import { lineQuantity, useCartStore } from "@/store/cart-store";
import { ColorSwatches } from "@/components/catalog/color-swatches";
import { SizeSelector } from "@/components/catalog/size-selector";
import { StockLabel } from "@/components/catalog/stock-label";

interface ProductCardProps {
  product: Product;
  /** Eager-load images for above-the-fold cards. */
  priority?: boolean;
  onOpen: (product: Product, variant: ProductVariant) => void;
}

const IMAGE_SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw";

export function ProductCard({ product, priority, onOpen }: ProductCardProps) {
  const [active, setActive] = useState<ProductVariant>(() => defaultVariant(product));
  const [preview, setPreview] = useState<ProductVariant | null>(null);
  /** Inline size picker opened by the "+" button on products with sizes. */
  const [pickingSize, setPickingSize] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const cartItems = useCartStore((s) => s.items);

  const needsSize = !isOneSizeVariant(active);
  /** Sizes of the active color, minus what is already in the cart. */
  const sizeOptions = active.sizeStocks.map(({ size, stock }) => ({
    size,
    stock: stock - lineQuantity(cartItems, cartKey(product.id, active.id, size)),
  }));
  const soldOut = isProductSoldOut(product);
  const sizesInStock = productSizesInStock(product);
  const shown = preview ?? active;
  const secondary = shown.gallery[0];
  const price = variantPrice(product, active);
  const canQuickAdd = sizeOptions.some((o) => o.stock > 0);
  const discount =
    product.compareAtPrice && product.compareAtPrice > price
      ? Math.round((1 - price / product.compareAtPrice) * 100)
      : 0;

  const add = (size: string) => {
    const added = addItem({
      key: cartKey(product.id, active.id, size),
      productId: product.id,
      variantId: active.id,
      size,
      name: product.name,
      colorName: active.colorName,
      hexColor: active.hexColor,
      imageUrl: active.imageUrl,
      unitPrice: price,
      maxStock: sizeStockOf(active, size),
    });
    setPickingSize(false);
    if (added) openCart();
  };

  const selectColor = (variant: ProductVariant) => {
    setActive(variant);
    setPickingSize(false);
  };

  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200/80 transition hover:shadow-xl hover:shadow-zinc-900/5 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:shadow-black/30">
      <button
        type="button"
        onClick={() => onOpen(product, active)}
        aria-label={`Ver ${product.name}`}
        className="group/media relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800"
      >
        <Image
          key={shown.id}
          src={shown.imageUrl}
          alt={`${product.name} — ${shown.colorName}`}
          fill
          sizes={IMAGE_SIZES}
          priority={priority}
          className={cn(
            "animate-fade-in object-cover transition duration-500 group-hover/media:scale-105",
            secondary && "group-hover/media:opacity-0",
            soldOut && "opacity-60 grayscale-[60%]",
          )}
        />
        {secondary && (
          <Image
            src={secondary}
            alt=""
            fill
            sizes={IMAGE_SIZES}
            className="object-cover opacity-0 transition duration-500 group-hover/media:scale-105 group-hover/media:opacity-100"
          />
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
          {product.badge && (
            <span className="rounded-full bg-zinc-900/90 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur dark:bg-white/90 dark:text-zinc-900">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          )}
        </div>
        {soldOut && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold tracking-wider text-zinc-600 uppercase ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-300 dark:ring-zinc-700">
            Agotado
          </span>
        )}
        {!soldOut && active.stock === 0 && !preview && (
          <span className="absolute inset-x-0 bottom-0 bg-zinc-900/75 py-1.5 text-center text-xs font-semibold text-white backdrop-blur">
            Agotado en este color
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <ColorSwatches
            variants={product.variants}
            activeId={active.id}
            onSelect={selectColor}
            onPreview={setPreview}
          />
          <span className="hidden text-[11px] text-zinc-500 sm:block">
            {product.variants.length} {product.variants.length === 1 ? "color" : "colores"}
          </span>
        </div>

        <button type="button" onClick={() => onOpen(product, active)} className="text-left">
          <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            {product.brand}
          </p>
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-base">
            {product.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {!productHasSizes(product)
              ? "Talle único"
              : sizesInStock.length > 0
                ? `Talles ${sizeRangeLabel(sizesInStock)}`
                : "Sin talles disponibles"}
          </p>
        </button>

        <StockLabel stock={active.stock} />

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            {discount > 0 && (
              <p className="text-xs text-zinc-400 line-through">
                {formatGs(product.compareAtPrice!)}
              </p>
            )}
            <p className="truncate text-base font-black tracking-tight sm:text-lg">
              {formatGs(price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              needsSize ? setPickingSize(true) : add(active.sizeStocks[0]?.size ?? ONE_SIZE_LABEL)
            }
            disabled={!canQuickAdd}
            aria-label={`Agregar ${product.name} ${active.colorName} al carrito`}
            aria-expanded={needsSize ? pickingSize : undefined}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {pickingSize && (
        <div
          role="dialog"
          aria-label={`Elegí tu talle de ${product.name}`}
          onKeyDown={(e) => e.key === "Escape" && setPickingSize(false)}
          className="absolute inset-x-0 bottom-0 z-10 animate-sheet-up rounded-t-3xl bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md sm:p-4 dark:bg-zinc-900/95"
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold">
              Elegí tu talle
              <span className="font-normal text-zinc-500"> · {active.colorName}</span>
            </p>
            <button
              type="button"
              onClick={() => setPickingSize(false)}
              aria-label="Cerrar selector de talle"
              className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-4" />
            </button>
          </div>
          <SizeSelector options={sizeOptions} value={null} onChange={add} size="sm" />
        </div>
      )}
    </article>
  );
}
