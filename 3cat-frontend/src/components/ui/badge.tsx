import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "outline" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variant === "default" && "bg-primary text-white",
        variant === "destructive" && "bg-red-500 text-white",
        variant === "outline" && "border border-gray-300 text-gray-800",
        className
      )}
      {...props}
    />
  );
}
