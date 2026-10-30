import { cn } from "@nobar/ui";
import Image from "next/image";

/** Demo product photo (same placeholders as the storefront; see the store's /about/credits). */
export function Photo({ kind, alt, className, sizes = "64px" }: { kind: string; alt: string; className?: string; sizes?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      <Image src={`/photos/${kind}.webp`} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
