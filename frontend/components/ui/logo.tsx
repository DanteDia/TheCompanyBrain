import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark — hexagonal "brain" carved with angular wedges. The mark is a
 * single SVG path with even-odd fill rule, so it themes via `currentColor`
 * and stays crisp at any size. A small terracotta accent dot lives at the
 * core to give it personality.
 */

type Variant = "default" | "inverted" | "mono" | "accent";

const VARIANT_TEXT: Record<Variant, { primary: string; secondary: string; accent: string }> = {
  default: {
    primary: "text-stone-900",
    secondary: "text-stone-500",
    accent: "text-accent-600",
  },
  inverted: {
    primary: "text-stone-50",
    secondary: "text-stone-300",
    accent: "text-accent-300",
  },
  mono: {
    primary: "text-stone-900",
    secondary: "text-stone-900",
    accent: "text-stone-900",
  },
  accent: {
    primary: "text-accent-700",
    secondary: "text-accent-500",
    accent: "text-accent-700",
  },
};

interface LogoMarkProps {
  size?: number;
  variant?: Variant;
  className?: string;
  /** Show the small accent dot at the brain core. Default true. */
  showAccent?: boolean;
}

/** Just the hexagonal mark — use anywhere you need a square brand symbol. */
export function LogoMark({
  size = 24,
  variant = "default",
  className,
  showAccent = true,
}: LogoMarkProps) {
  const colors = VARIANT_TEXT[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(colors.primary, "shrink-0", className)}
      aria-label="The Company Brain"
    >
      {/* Hexagonal silhouette with 5 angular wedges carved out via even-odd
          fill rule — the resulting negative space reads as an abstract brain /
          neural network. Single path so theming with currentColor stays clean. */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="
          M 60 6
          L 106.78 32.99
          L 106.78 86.99
          L 60 113.98
          L 13.22 86.99
          L 13.22 32.99
          Z

          M 60 28
          L 78 40
          L 60 56
          Z

          M 86 44
          L 92 64
          L 72 60
          Z

          M 84 78
          L 70 70
          L 84 92
          Z

          M 56 78
          L 38 84
          L 50 100
          Z

          M 32 64
          L 50 60
          L 40 78
          Z
        "
      />
      {/* Accent dot at the core — small terracotta personality marker.
          Sits inside the negative space at the visual center of the brain. */}
      {showAccent && (
        <circle
          cx="60"
          cy="62"
          r="3.2"
          className={variant === "mono" ? "" : colors.accent}
          fill="currentColor"
        />
      )}
    </svg>
  );
}

interface LogoProps {
  size?: number;
  variant?: Variant;
  className?: string;
  /** Show the wordmark next to the icon. Default true. */
  showText?: boolean;
  /** Wrap the lockup in a Link to "/". Default true — set false when the
   *  logo lives inside something that already routes (sidebar nav). */
  asLink?: boolean;
  /** Single-line wordmark vs stacked two-line. Default "single". */
  layout?: "single" | "stacked";
}

/** Full lockup — mark + wordmark — used in headers, login, video splash. */
export function Logo({
  size = 24,
  variant = "default",
  className,
  showText = true,
  asLink = true,
  layout = "single",
}: LogoProps) {
  const colors = VARIANT_TEXT[variant];

  const content = (
    <>
      <LogoMark size={size} variant={variant} />
      {showText && (
        <span
          className={cn(
            "font-medium tracking-tight",
            layout === "stacked" ? "leading-[1.05]" : ""
          )}
        >
          {layout === "stacked" ? (
            <span className="block">
              <span className={colors.secondary}>The</span>{" "}
              <span className={colors.primary}>Company</span>
              <br />
              <span className={colors.primary}>Brain</span>
            </span>
          ) : (
            <span className="inline">
              <span className={colors.secondary}>The</span>{" "}
              <span className={colors.primary}>Company</span>{" "}
              <span className={colors.primary}>Brain</span>
            </span>
          )}
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    "inline-flex items-center gap-2 group",
    className
  );

  if (asLink) {
    return (
      <Link href="/" className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return <span className={wrapperClass}>{content}</span>;
}
