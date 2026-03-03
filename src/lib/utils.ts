import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt$(value: number | null | undefined): string {
  if (value == null) return "$0.00";
  return "$" + Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MM/dd/yy");
}

export function pct(value: number): string {
  return value.toFixed(1) + "%";
}
