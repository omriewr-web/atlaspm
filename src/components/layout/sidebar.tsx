"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  AlertTriangle,
  Scale,
  DoorOpen,
  FileText,
  CalendarClock,
  BarChart3,
  Database,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, UserRole } from "@/types";
import PropertySelector from "./property-selector";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dash" },
  { href: "/daily", label: "Daily Summary", icon: CalendarClock, perm: "dash" },
  { href: "/alerts", label: "Arrears Alerts", icon: AlertTriangle, perm: "fin" },
  { href: "/legal", label: "Legal Cases", icon: Scale, perm: "legal" },
  { href: "/vacancies", label: "Vacancies", icon: DoorOpen, perm: "vac" },
  { href: "/leases", label: "Leases", icon: FileText, perm: "lease" },
  { href: "/maintenance", label: "Work Orders", icon: Wrench, perm: "maintenance" },
  { href: "/reports", label: "Reports", icon: BarChart3, perm: "reports" },
  { href: "/data", label: "Data Management", icon: Database, perm: "upload" },
  { href: "/users", label: "Users", icon: Users, perm: "users" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role || "COLLECTOR") as UserRole;

  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <PropertySelector />
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems
          .filter((item) => hasPermission(role, item.perm))
          .map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                  active
                    ? "text-accent bg-accent/10 border-r-2 border-accent"
                    : "text-text-muted hover:text-text-primary hover:bg-card-hover"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
