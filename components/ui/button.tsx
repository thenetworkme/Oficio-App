import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/cn";

// "Pomodoro" button. Variants primary/outline/ghost/subtle/danger are the
// old "Punto" ones, UNCHANGED in color (still read --signal/--border/--card/
// --line/--danger, see app/globals.css's backward-compat section) — only
// the shared --radius-button token changed under them (999px pill -> 6px),
// which is intentional and sitewide (pure geometry, see globals.css).
//
// New variants match design-reference/pomodoro/html/PomoTimer.dc.html's
// button classes:
//   go      -> `.go`   the big primary "pressable" button: a fixed near-
//                        white --go-bg (NOT --card-solid/theme-dependent —
//                        see app/globals.css's --go-bg comment for why),
//                        text colored in the CURRENT mode color (reads
//                        `var(--mode-bg)` live, no extra prop needed), a
//                        6px shadow that collapses + the button slides down
//                        6px while `pressed` (sustained state, e.g. "timer
//                        is running" — NOT just `:active` while clicking,
//                        though that's covered too)
//   dark    -> `.btnd`  solid #222/white flat button
//   light   -> `.light` `.btnl` flat light-gray button
//   onColor -> `.btng`  translucent-white outline button, for secondary
//                        actions sitting directly on the colored --mode-bg
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 rounded-button border font-mono text-[12px] font-medium uppercase tracking-[0.12em] transition-[background,color,border-color,transform,box-shadow,opacity] duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "border-signal bg-signal text-ink-solid hover:brightness-110 active:brightness-95",
        outline: "border-border bg-transparent text-ink hover:border-border-hover hover:bg-card",
        ghost: "border-transparent bg-transparent text-muted hover:text-ink",
        subtle: "border-line bg-card text-ink hover:border-border",
        danger: "border-danger/45 bg-transparent text-danger hover:border-danger hover:bg-danger/10",
        go: "border-0 bg-go-bg font-sans text-[16px] font-bold normal-case tracking-normal text-[var(--mode-bg)] shadow-[0_6px_0_var(--go-shadow)] active:translate-y-1.5 active:shadow-none data-[pressed=true]:translate-y-1.5 data-[pressed=true]:shadow-none",
        dark: "border-0 bg-flat-dark text-flat-dark-ink hover:opacity-85",
        light: "border-0 bg-surface-muted text-surface-muted-ink hover:bg-surface-muted-hover",
        onColor: "border-card-tint-border bg-card-tint text-mode-ink font-sans text-[15px] font-semibold normal-case tracking-normal hover:bg-white/30",
      },
      size: {
        default: "h-[52px] px-6",
        sm: "h-10 px-4.5 text-[11px]",
        icon: "size-[52px] p-0",
        iconSm: "size-10 p-0",
        /** Reference's 44px buttons (.btnw/.btnd/.btnl/.btng height). */
        md: "h-11 px-5.5",
        /** Reference's 55px "go" button height (.go). */
        lg: "h-[55px] px-8 text-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Sustained pressed/held look for the `go` variant (reference's `.go.on`
   * — applied while the timer is RUNNING, not just while the mouse is
   * physically down). Ignored by every other variant. */
  pressed?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, pressed, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-pressed={pressed ? "true" : undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
