"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  FileVideo,
  Activity,
  BarChart3,
  Terminal,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/campaigns", label: "Campaigns", icon: LayoutDashboard },
  { href: "/clips", label: "Clips", icon: FileVideo },
  { href: "/pages", label: "Pages", icon: Video },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/command", label: "Command", icon: Terminal },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <Zap className="w-6 h-6 text-brand-500 mr-2" />
          <span className="font-bold text-lg tracking-tight">
            Clipping<span className="text-brand-500">Factory</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">v1.0.0 — Autonomous Mode</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
