import { BrandLogo } from "@/components/layout/brand-logo";
import { SearchInput } from "@/components/layout/search-input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CartButton } from "@/components/cart/cart-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <BrandLogo />
        <SearchInput className="order-last w-full md:order-none md:mx-auto md:w-auto md:max-w-md md:flex-1" />
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
