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
        "min-h-11 inline-flex items-center gap-2 rounded-chip border-[3px] border-ink px-4 text-[15px] font-bold transition-colors",
        pressed ? "bg-a1 text-ink" : "bg-card text-ink",
        className,
      )}
      {...props}
    >
      {dotColor && <span className="size-2.5 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  );
}
