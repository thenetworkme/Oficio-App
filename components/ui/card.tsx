import * as React from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * "legacy" (default, unchanged — every existing call site that doesn't
   * pass `tone` keeps rendering exactly as before: 1px hairline border +
   * --card/--line, just at the new 8px --radius-card instead of 22px).
   *
   * New "Pomodoro" tones, matching design-reference/pomodoro/html/
   * PomoTimer.dc.html:
   *   "solid" -> `.wc`, the actual white/dark card (--card-solid +
   *              --card-solid-ink text), no border — content like task
   *              rows, the Ajustes panel, stat tiles.
   *   "tint"  -> `.card`, the translucent overlay for a section that
   *              stays ON the colored --mode-bg (--card-tint +
   *              --mode-ink text), no border.
   */
  tone?: "legacy" | "solid" | "tint";
}

export function Card({ className, style, tone = "legacy", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card",
        tone === "legacy" && "border border-line bg-card",
        tone === "solid" && "border-0 bg-card-solid text-card-solid-ink",
        tone === "tint" && "border-0 bg-card-tint text-mode-ink",
        className,
      )}
      style={style}
      {...props}
    />
  );
}

export function CardHeading({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("m-0 text-[22px] font-medium tracking-tight", className)} {...props} />;
}
