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

// "Pomodoro" toggle — reference's `.sw`: a filled pill track (light-gray
// off / the CURRENT mode color on, via --mode-bg — matching the
// reference's own `style="--c:#BA4949"` per-switch override pattern, see
// app/globals.css's --mode-bg contract) with a white circular thumb that
// slides and carries its own small drop shadow.
export function Switch({ checked, onCheckedChange, label, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn("relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-chip border-0 p-0 outline-offset-2 transition-colors", className)}
      style={{ background: checked ? "var(--mode-bg)" : "var(--switch-off)" }}
    >
      <SwitchPrimitive.Thumb
        className="block size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0_/_25%)] transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
      />
    </SwitchPrimitive.Root>
  );
}
