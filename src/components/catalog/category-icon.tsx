import Image from "next/image";
import { resolveCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  category: { icon?: string | null; slug: string };
  /** Size of the icon box, in px. */
  size?: number;
  className?: string;
}

/** Category icon: the admin's uploaded image or one of the built-in icons. */
export function CategoryIcon({ category, size = 16, className }: CategoryIconProps) {
  const resolved = resolveCategoryIcon(category);
  if (resolved.kind === "image") {
    return (
      <Image
        src={resolved.url}
        alt=""
        width={size}
        height={size}
        sizes={`${size * 2}px`}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  const Icon = resolved.icon;
  return <Icon className={cn("shrink-0", className)} style={{ width: size, height: size }} aria-hidden />;
}
