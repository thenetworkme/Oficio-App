import * as React from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  dotColor?: string;
}

// Punto chip: pill, 1px hairline border, Geist Mono uppercase label.
// Selected state is a plain inverted ink/ink-solid fill — NOT the signal
// color, which is reserved for primary actions and single highlighted data
// points (see design-reference/punto README + the `.chip` rule in
// PuntoPanel.dc.html).
export function Chip({ pressed, dotColor, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-chip border px-4.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-colors",
        // Inverted selected state: bg = this theme's own ink, text = this
        // theme's own paper. NOT `text-ink-solid` — ink-solid is for text on
        // a --signal-colored background (always near-black, both palettes);
        // --ink flips per palette (near-white in dark, near-black in light),
        // so pairing it with ink-solid text would render invisible
        // black-on-black in light mode. ink/paper are always each other's
        // max-contrast pair within a palette, so this combo is safe in both.
        pressed ? "border-ink bg-ink text-paper" : "border-border text-muted hover:border-border-hover hover:text-ink",
        className,
      )}
      {...props}
    >
      {dotColor && <span className="size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  );
}
