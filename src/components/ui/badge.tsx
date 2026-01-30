import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-500 text-white hover:bg-gray-500/80", // Untuk status 'pending'
        secondary:
          "border-transparent bg-purple-500 text-white hover:bg-purple-500/80", // Untuk status 'completed'
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-500/80", // Untuk status 'rejected'
        outline: "text-gray-400 border-gray-600 hover:bg-gray-800", // Untuk status 'cancelled'
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80", // Untuk status 'approved'
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80", // Untuk status 'in_progress'
        warning:
          "border-transparent bg-orange-500 text-white hover:bg-orange-500/80", // Untuk status 'rescheduled'
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };