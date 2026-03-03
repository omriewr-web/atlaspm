"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Building2 } from "lucide-react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-text-primary">ICER</h1>
        <span className="text-xs text-text-dim">Property Tracker</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-muted">
          {session?.user?.name}{" "}
          <span className="text-xs text-text-dim">({session?.user?.role})</span>
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-text-dim hover:text-text-muted transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
