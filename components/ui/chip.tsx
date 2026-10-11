import * as React from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  dotColor?: string;
}

export function Chip({ pressed, dotColor, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "min-h-11 inline-flex items-center gap-2 rounded-chip border px-4 text-sm font-semibold transition-colors",
        pressed ? "border-accent bg-track text-text" : "border-line bg-transparent text-text",
        className,
      )}
      {...props}
    >
      {dotColor && <span className="size-2.5 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  );
}
