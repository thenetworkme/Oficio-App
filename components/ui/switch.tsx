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
        "relative inline-flex h-10 w-[72px] shrink-0 items-center rounded-chip border-[3px] border-ink p-0 outline-offset-2",
        className,
      )}
      style={{ background: checked ? "var(--a3)" : "var(--card)" }}
    >
      <SwitchPrimitive.Thumb
        className="block size-7 rounded-full transition-transform"
        style={{
          transform: checked ? "translateX(32px)" : "translateX(3px)",
          // Checked: the track is --a3 (always a light pastel), so the knob
          // needs the constant dark ink-solid to stay visible. Unchecked:
          // the track is --card, which --ink is already calibrated against.
          background: checked ? "var(--ink-solid)" : "var(--ink)",
        }}
      />
    </SwitchPrimitive.Root>
  );
}
