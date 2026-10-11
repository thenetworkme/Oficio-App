import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border-[3px] border-ink bg-card shadow-[6px_6px_0_var(--shadow)]", className)}
      style={style}
      {...props}
    />
  );
}

export function CardHeading({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[22px] font-bold tracking-tight m-0", className)} {...props} />;
}
