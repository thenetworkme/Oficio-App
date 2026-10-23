import * as React from "react";
import { cn } from "@/lib/cn";

// "Pomodoro" input — reference's `.fld`: a FILLED light-gray rounded box
// (NOT the old underline style), dark text — matches the --surface-muted
// family used by the flat light button/unselected chip. A self-contained
// background+text pair, so it reads fine regardless of what's behind it
// (unlike the old underline input, which relied on the surrounding page's
// --paper/--card contrast).
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-11 rounded-button border-0 bg-surface-muted px-3.5 py-2 text-[16px] text-surface-muted-ink placeholder:text-surface-muted-ink placeholder:opacity-60 transition-colors outline-none focus:ring-2 focus:ring-[var(--mode-bg)]",
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
