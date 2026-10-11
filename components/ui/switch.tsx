"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "relative inline-flex h-11 w-[52px] shrink-0 items-center rounded-chip border-0 bg-transparent p-0 outline-offset-2",
        className,
      )}
    >
      <span
        className="absolute left-0 top-2 h-7 w-[52px] rounded-chip transition-colors"
        style={{ background: checked ? "var(--accent)" : "var(--line)" }}
      />
      <SwitchPrimitive.Thumb
        className="absolute top-3 size-5 rounded-full bg-text transition-transform"
        style={{ transform: checked ? "translateX(28px)" : "translateX(4px)" }}
      />
    </SwitchPrimitive.Root>
  );
}
