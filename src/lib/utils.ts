import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Whether a file needs a <video> element (true) or <img> element (false).
 * Animated WEBP/GIF/APNG play natively in <img>; only actual video
 * containers (mp4, webm, etc.) need <video>.
 */
export function needsVideoElement(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["mp4", "webm", "avi", "mov", "mkv"].includes(ext);
}
