import * as React from "react";
import { cn } from "@/lib/utils"; // make sure this exists

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <div
      className={cn("shrink-0 bg-border h-[1px] w-full", className)}
      {...props}
    />
  );
}
