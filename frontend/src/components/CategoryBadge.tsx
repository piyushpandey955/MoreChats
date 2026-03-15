"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/utils";

interface CategoryBadgeProps {
  category: string | null;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  if (!category) return null;

  const colors = CATEGORY_COLORS[category] || "bg-zinc-500/20 text-zinc-400";
  const label = CATEGORY_LABELS[category] || category;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        colors,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {label}
    </span>
  );
}
