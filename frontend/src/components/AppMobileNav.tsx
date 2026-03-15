"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, GitBranch, Home, Kanban, Settings, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultItems = [
  { href: "/", label: "Discovery", icon: Home },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile-setup", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

const pipelineItems = [
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/", label: "Leads", icon: Users },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppMobileNav() {
  const pathname = usePathname();
  const isPipeline = pathname === "/pipeline";
  const items = isPipeline ? pipelineItems : defaultItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-orange-500/10 bg-[#23140f]/95 backdrop-blur-md">
      <div className={cn(
        "flex items-center",
        isPipeline ? "justify-between px-8 py-3" : "justify-around px-2 py-2"
      )}>
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1",
                isActive ? "text-orange-500" : "text-slate-500"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
