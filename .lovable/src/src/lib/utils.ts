import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}

export function slugify(value: string) {
return value
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/(^-|-$)+/g, "");
}

export function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
