import * as React from "react";
import { cn } from "@/lib/cn";

// Punto surface: 22px radius, 1px hairline border, no drop shadow — flat.
export function Card({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-line bg-card", className)}
      style={style}
      {...props}
    />
  );
}

export function CardHeading({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("m-0 text-[22px] font-medium tracking-tight", className)} {...props} />;
}
