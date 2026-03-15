import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_COLORS: Record<string, string> = {
  ambitious: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  romantic: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  sweet: "bg-pink-500/15 text-pink-300 border-pink-400/30",
  friend: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  fling: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  nurturer: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};

export const CATEGORY_LABELS: Record<string, string> = {
  ambitious: "The Ambitious One",
  romantic: "The Romantic One",
  sweet: "The Sweet One",
  friend: "The Friend",
  fling: "The Fling",
  nurturer: "The Nurturer",
};

export const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-slate-500/20 text-slate-300",
  analyzed: "bg-purple-500/20 text-purple-300",
  engaging: "bg-amber-500/20 text-amber-300",
  messaged: "bg-orange-500/20 text-orange-300",
  replied: "bg-emerald-500/20 text-emerald-300",
  active: "bg-indigo-500/20 text-indigo-300",
  archived: "bg-zinc-500/20 text-zinc-400",
};

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
