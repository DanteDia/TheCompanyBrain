import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 group",
        className
      )}
    >
      {/* Mark */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-stone-900"
      >
        <path
          d="M12 3C9.5 3 7 4.5 7 7.5c-1.5.3-3 1.5-3 3.5 0 1.5.8 2.5 2 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M12 3c2.5 0 5 1.5 5 4.5 1.5.3 3 1.5 3 3.5 0 1.5-.8 2.5-2 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M6 14c0 2 1.5 3.5 3.5 3.5.5 1.5 1.5 3 3.5 3s3-1.5 3.5-3c2 0 3.5-1.5 3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="1.5" fill="#D2691E" />
      </svg>
      {showText && (
        <span className="font-medium tracking-tight">
          <span className="text-stone-500">Company</span>{" "}
          <span className="text-stone-900">Brain</span>
        </span>
      )}
    </Link>
  );
}
