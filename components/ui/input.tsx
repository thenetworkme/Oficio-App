import * as React from "react";
import { cn } from "@/lib/cn";

// Punto input: no box at all — transparent background, just a 1px bottom
// border that turns signal-colored on focus. Matches the reference's `.inp`.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-10 rounded-none border-0 border-b border-border bg-transparent px-0 pb-3 pt-2 text-[16px] text-ink placeholder:text-muted transition-colors focus:border-signal focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("label-xs", className)} {...props} />;
}
