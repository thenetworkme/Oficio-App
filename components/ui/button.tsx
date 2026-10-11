import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/cn";

// Pegatina sticker button: 3px ink border, hard offset shadow, "squish" on
// press (shadow shrinks + element shifts toward it).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-button border-[3px] border-ink font-bold transition-[transform,box-shadow] duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shadow-[6px_6px_0_var(--shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_var(--shadow)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_var(--shadow)]",
  {
    variants: {
      variant: {
        primary: "bg-a1 text-ink-solid",
        outline: "bg-card text-ink",
        ghost: "border-transparent text-muted shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 hover:text-ink",
        subtle: "bg-card text-ink",
        danger: "bg-card text-danger border-danger shadow-[6px_6px_0_var(--danger)] hover:shadow-[9px_9px_0_var(--danger)] active:shadow-[2px_2px_0_var(--danger)]",
      },
      size: {
        default: "min-h-14 px-6 text-[17px]",
        sm: "min-h-11 px-4 text-sm",
        icon: "size-14 p-0",
        iconSm: "size-11 p-0",
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
