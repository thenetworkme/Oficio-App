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
export function Chip({ pressed, dotColor, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-chip border border-transparent px-4.5 text-[14px] font-semibold transition-colors",
        pressed
          ? "bg-flat-dark text-flat-dark-ink"
          : "bg-surface-muted text-surface-muted-ink hover:bg-surface-muted-hover",
        className,
      )}
      {...props}
    >
      {dotColor && <span className="size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  );
}
