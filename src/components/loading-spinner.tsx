
import * as React from "react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

    