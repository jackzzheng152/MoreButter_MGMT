import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely calls toFixed() on a number, handling null/undefined values
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string or "0.00" if value is null/undefined
 */
export function safeToFixed(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `0.${'0'.repeat(decimals)}`;
  }
  return value.toFixed(decimals);
}

