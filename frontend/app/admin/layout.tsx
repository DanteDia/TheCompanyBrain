"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Workflow,
  Lightbulb,
  BookOpen,
  Phone,
  Plug,
  Upload,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ORGANIZATION } from "@/lib/mock-data";
import { AdminPasswordGate } from "@/components/admin-password-gate";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Brain Explorer",
    items: [
      { href: "/brain/people", label: "People", icon: Users },
      { href: "/brain/tools", label: "Systems", icon: Wrench },
      { href: "/brain/processes", label: "Processes", icon: Workflow },
      { href: "/brain/rules", label: "Unwritten rules", icon: Lightbulb },
      { href: "/brain/glossary", label: "Glossary", icon: BookOpen },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/interviews", label: "Interviews", icon: Phone },
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/upload", label: "Upload data", icon: Upload },
    ],
  },
  {
    label: null,
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminPasswordGate>
      <AdminLayoutInner pathname={pathname}>{children}</AdminLayoutInner>
    </AdminPasswordGate>
  );
}

function AdminLayoutInner({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="flex h-dvh bg-stone-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-stone-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-100">
          <Logo />
        </div>
        <div className="px-3 py-2 border-b border-stone-100">
          <div className="rounded-md bg-stone-50 border border-stone-200 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              Tenant
            </div>
            <div className="text-sm font-medium text-stone-900 mt-0.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {ORGANIZATION.name}
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-stone-400 font-medium">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-stone-900 text-white"
                          : "text-stone-700 hover:bg-stone-100"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-stone-100 px-3 py-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Avatar name="Tomás Calligaris" size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-stone-900 truncate">
                Tomás Calligaris
              </div>
              <div className="text-[10px] text-stone-500">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
