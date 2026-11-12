import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

export function BrandLogo() {
  return (
    <Link href="/" aria-label="Kapy Store — inicio" className="group flex shrink-0 items-center gap-2.5">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-sky-600/10 ring-1 ring-zinc-200 transition group-hover:ring-sky-600 sm:size-12 dark:ring-zinc-800">
        <Image
          src="/branding/logo.png"
          alt=""
          fill
          sizes="48px"
          priority
          className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-black tracking-tight uppercase sm:text-xl">
          Kapy<span className="text-red-600"> Store</span>
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] text-sky-600 uppercase">
          <BadgeCheck className="size-3.5" aria-hidden />
          Official Store
        </span>
      </span>
    </Link>
  );
}
