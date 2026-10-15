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

// Punto toggle: pill track (transparent fill), 1px border that turns signal
// colored when on, a dot thumb that slides — matches the reference's `.tg`.
export function Switch({ checked, onCheckedChange, label, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-chip border bg-transparent p-0 outline-offset-2 transition-colors",
        className,
      )}
      style={{ borderColor: checked ? "var(--signal)" : "var(--border)" }}
    >
      <SwitchPrimitive.Thumb
        className="block size-4 rounded-full transition-transform"
        style={{
          transform: checked ? "translateX(20px)" : "translateX(3px)",
          background: checked ? "var(--signal)" : "var(--muted)",
        }}
      />
    </SwitchPrimitive.Root>
  );
}
