import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand mark — sourced from /public/logo-{mark|full}[-variant].png.
 *
 * The artwork comes from the canonical SVG/PNG that Tomy designed (hexagonal
 * brain silhouette + custom wordmark). The PNG variants live in /public:
 *
 *   logo-mark.png             — icon only, dark on light bg (default)
 *   logo-mark-accent.png      — icon only, terracotta tint
 *   logo-mark-inverted.png    — icon only, white (for dark bg)
 *
 *   logo-full.png             — mark + wordmark, dark on light bg
 *   logo-full-accent.png      — mark + wordmark, terracotta
 *   logo-full-inverted.png    — mark + wordmark, white
 *
 * Next.js Image handles automatic WebP/AVIF serving + responsive srcsets, so
 * even though the source is raster the browser gets the optimized format.
 */

type Variant = "default" | "inverted" | "accent" | "mono";

const VARIANT_SUFFIX: Record<Variant, string> = {
  default: "",
  inverted: "-inverted",
  accent: "-accent",
  mono: "", // mono uses default (it's already monochrome black)
};

const MARK_RATIO = 1; // logo-mark.png is 290x290 → square
const FULL_RATIO = 1746 / 299; // logo-full.png aspect ≈ 5.84

interface LogoMarkProps {
  size?: number;
  variant?: Variant;
  className?: string;
  /** Disable the priority hint (only top-of-page logos should be priority). */
  priority?: boolean;
}

/** Just the hexagonal mark — square, themeable via variant. */
export function LogoMark({
  size = 24,
  variant = "default",
  className,
  priority = false,
}: LogoMarkProps) {
  const src = `/logo-mark${VARIANT_SUFFIX[variant]}.png`;
  return (
    <Image
      src={src}
      alt="The Company Brain"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}

interface LogoProps {
  /** Height in px of the rendered lockup. Default 28. */
  size?: number;
  variant?: Variant;
  className?: string;
  /** Show the wordmark next to the icon. Default true. When false, behaves
   *  like LogoMark. */
  showText?: boolean;
  /** Wrap the lockup in a Link to "/". Default true. */
  asLink?: boolean;
  /** Pass true on the topmost above-the-fold logo so Next.js preloads it. */
  priority?: boolean;
}

/** Full lockup — mark + wordmark, single image with the canonical typography. */
export function Logo({
  size = 28,
  variant = "default",
  className,
  showText = true,
  asLink = true,
  priority = false,
}: LogoProps) {
  if (!showText) {
    const inner = (
      <LogoMark size={size} variant={variant} priority={priority} />
    );
    if (!asLink) return <span className={className}>{inner}</span>;
    return (
      <Link href="/" className={cn("inline-flex items-center", className)}>
        {inner}
      </Link>
    );
  }

  // Full lockup — wordmark baked into the image. Compute width from height.
  const height = size;
  const width = Math.round(size * FULL_RATIO);
  const src = `/logo-full${VARIANT_SUFFIX[variant]}.png`;

  const img = (
    <Image
      src={src}
      alt="The Company Brain"
      width={width}
      height={height}
      priority={priority}
      className="shrink-0"
      style={{ height, width: "auto" }}
    />
  );

  if (!asLink) return <span className={className}>{img}</span>;
  return (
    <Link href="/" className={cn("inline-flex items-center", className)}>
      {img}
    </Link>
  );
}
