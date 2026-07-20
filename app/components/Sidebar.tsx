"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  Folder,
  FileBarChart,
  Settings,
} from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  match: (pathname: string) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/",
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    match: (pathname) => pathname.startsWith("/users"),
  },
  {
    label: "Active Directory",
    href: "/active-directory",
    icon: Shield,
    match: (pathname) =>
      pathname.startsWith("/active-directory") ||
      pathname.startsWith("/organizational-units"),
  },
  {
    label: "File Server",
    href: "/file-server",
    icon: Folder,
    match: (pathname) =>
      pathname.startsWith("/file-server"),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
    match: (pathname) =>
      pathname.startsWith("/reports"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    match: (pathname) =>
      pathname.startsWith("/settings"),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex min-h-screen w-72 shrink-0 flex-col bg-slate-950 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Enterprise
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Admin Portal
        </p>
      </div>

      <nav className="mt-10 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-xl px-4 py-3.5 font-medium transition-all duration-200 ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white" />
              )}

              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  active
                    ? "bg-white/15 text-white"
                    : "bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={2} />
              </span>

              <span>{item.label}</span>

              {active && (
                <span className="ml-auto h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Environment
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />

          <div>
            <p className="text-sm font-semibold text-white">
              contoso.local
            </p>

            <p className="text-xs text-slate-400">
              Connected
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}