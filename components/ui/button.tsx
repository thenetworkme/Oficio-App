import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/cn";

// Punto button: fully pill-shaped, Geist Mono uppercase label, wide tracking.
// Primary = solid signal background + near-black text. Secondary (outline) =
// transparent background, 1px hairline border, hover fills --card. Flat —
// no shadows, no rotation, no squish — see app/globals.css's big comment on
// the Pegatina -> Punto structural rewrite.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 rounded-button border font-mono text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "border-signal bg-signal text-ink-solid hover:brightness-110 active:brightness-95",
        outline: "border-border bg-transparent text-ink hover:border-border-hover hover:bg-card",
        ghost: "border-transparent bg-transparent text-muted hover:text-ink",
        subtle: "border-line bg-card text-ink hover:border-border",
        danger: "border-danger/45 bg-transparent text-danger hover:border-danger hover:bg-danger/10",
      },
      size: {
        default: "h-[52px] px-6",
        sm: "h-10 px-4.5 text-[11px]",
        icon: "size-[52px] p-0",
        iconSm: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
