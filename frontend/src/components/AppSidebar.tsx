"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, GitBranch, Home, Settings, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Discovery", icon: Home },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile-setup", label: "Profile Setup", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 min-h-screen border-r border-orange-500/20 bg-[#23140f]/95 p-4 flex-col fixed">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="size-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center border border-orange-400/30">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">MoreChats</h1>
          <p className="text-[11px] text-slate-500">Lead Gen Suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors border",
                isActive
                  ? "bg-orange-500/10 text-orange-300 border-orange-400/30"
                  : "text-slate-400 border-transparent hover:bg-slate-900/60 hover:text-slate-200"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-orange-500/20 pt-4">
        <div className="px-3 text-xs text-slate-500">
          <p className="text-slate-300 font-medium">u/I_exist</p>
          <p className="mt-1">The Quiet Storm</p>
        </div>
      </div>
    </aside>
  );
}
