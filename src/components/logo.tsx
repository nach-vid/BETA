
import * as React from "react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("transition-all duration-300 group group-hover:animate-glow", className)}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="hsl(var(--chart-1))" strokeWidth="2" filter="url(#glow)">
        <line x1="50" y1="15" x2="50" y2="30" />
        <rect x="40" y="30" width="20" height="40" fill="hsl(var(--chart-1))" />
        <line x1="50" y1="70" x2="50" y2="85" />
      </g>
    </svg>
  );
}
