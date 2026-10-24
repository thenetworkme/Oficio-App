import * as React from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  dotColor?: string;
}

// "Pomodoro" chip — reference's `.chp`: unselected = the flat light-gray
// --surface-muted surface, selected = the flat dark --flat-dark surface
// (#222/white), both fixed-contrast pairs that don't depend on light/dark
// mode (see app/globals.css's big comment), so this is a safe sitewide
// restyle with no contrast risk, unlike the old ink/paper-inverted look.
//
// The selected state's `--flat-dark` (#222, fixed) is only ~2 luminance
// steps off `--card-solid`'s dark-mode value (#202024) — multiple
// redesign-phase agents independently hit the same bug: a selected chip
// sitting on a `Card tone="solid"` in dark mode nearly disappears into its
// parent, edges included (reported/fixed locally in Ajustes, Retos).
// Fixed centrally here with a 1px `--card-solid-line` border, which only
// shows a visible edge when the chip's fill and its background are close in
// value — it's a no-op in light mode and everywhere else the chip already
// had enough contrast against its background.
export function Chip({ pressed, dotColor, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-chip border px-4.5 text-[14px] font-semibold transition-colors",
        pressed
          ? "border-card-solid-line bg-flat-dark text-flat-dark-ink"
          : "border-transparent bg-surface-muted text-surface-muted-ink hover:bg-surface-muted-hover",
        className,
      )}
      {...props}
    >
      {dotColor && <span className="size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  );
}
