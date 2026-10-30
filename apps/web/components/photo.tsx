import { cn, ProduceArt } from "@nobar/ui";
import Image from "next/image";
import { photoSrc } from "@/lib/photos";

/** Product photo; falls back to the illustration tile for produce without a photo. */
export function Photo({
  kind,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 240px",
  priority,
  fit = "cover",
  fallback,
}: {
  kind: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  fallback?: { emoji: string; hue: number };
}) {
  const src = photoSrc(kind);
  if (!src) return <ProduceArt emoji={fallback?.emoji ?? "🍎"} hue={fallback?.hue ?? 120} kind={kind} className={className} label={alt} />;
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("transition-transform duration-500 group-hover:scale-[1.04]", fit === "cover" ? "object-cover" : "object-contain")}
      />
    </div>
  );
}
