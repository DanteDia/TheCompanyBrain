"use client";

import { useState } from "react";
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
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ORGANIZATION } from "@/lib/mock-data";
import { AdminPasswordGate } from "@/components/admin-password-gate";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/chat", label: "Company Brain", icon: MessageCircle },
    ],
  },
  {
    label: "Brain",
    items: [
      { href: "/brain/people", label: "People", icon: Users },
      { href: "/brain/tools", label: "Tools", icon: Wrench },
      { href: "/brain/processes", label: "Processes", icon: Workflow },
      { href: "/brain/rules", label: "Rules", icon: Lightbulb },
      { href: "/brain/glossary", label: "Glossary", icon: BookOpen },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/interviews", label: "Interviews", icon: Phone },
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/upload", label: "Upload data", icon: Upload },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <AdminPasswordGate>
      <AdminShell pathname={pathname || ""}>{children}</AdminShell>
    </AdminPasswordGate>
  );
}

function AdminShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const [locale, setLocale] = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-stone-50">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4">
        <Logo />
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 rounded-full hover:bg-stone-100 inline-flex items-center justify-center text-stone-700"
        >
          <Menu className="h-5 w-5" strokeWidth={1.6} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed/slide on mobile, static on desktop */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 flex-col border-r border-stone-200 bg-white",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 hidden md:flex"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-stone-100">
          <Logo />
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden h-8 w-8 rounded-full hover:bg-stone-100 inline-flex items-center justify-center text-stone-600"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
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
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 md:py-1.5 text-sm transition-colors",
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
        <div className="border-t border-stone-100 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              Language
            </span>
            <LocaleToggle locale={locale} onChange={setLocale} />
          </div>
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

      {/* Main — push down on mobile so the top bar doesn't overlap */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
