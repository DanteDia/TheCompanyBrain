import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-stone-200 bg-stone-50 text-stone-700",
        accent:
          "border-accent-200 bg-accent-50 text-accent-700",
        success:
          "border-green-200 bg-green-50 text-green-700",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-700",
        info:
          "border-blue-200 bg-blue-50 text-blue-700",
        outline: "border-stone-300 text-stone-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
