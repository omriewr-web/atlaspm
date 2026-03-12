"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Building2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  userCount: number;
  buildingCount: number;
}

/**
 * Org switcher dropdown — visible only to SUPER_ADMIN.
 * Sets a cookie that overrides org scoping for all subsequent queries.
 */
export default function OrgSwitcher() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("All Organizations");
  const ref = useRef<HTMLDivElement>(null);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const { data: orgs } = useQuery<OrgOption[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Read initial state from cookie
  useEffect(() => {
    const match = document.cookie.match(/atlas_org_override=([^;]+)/);
    if (match) {
      const orgId = decodeURIComponent(match[1]);
      setSelectedOrg(orgId);
      const org = orgs?.find((o) => o.id === orgId);
      if (org) setSelectedName(org.name);
    }
  }, [orgs]);

  if (!isSuperAdmin) return null;

  function selectOrg(org: OrgOption | null) {
    if (org) {
      document.cookie = `atlas_org_override=${encodeURIComponent(org.id)}; path=/; max-age=${60 * 60 * 24}`;
      setSelectedOrg(org.id);
      setSelectedName(org.name);
    } else {
      document.cookie = "atlas_org_override=; path=/; max-age=0";
      setSelectedOrg(null);
      setSelectedName("All Organizations");
    }
    setOpen(false);
    // Reload to apply new org scope
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-text-muted bg-card-hover hover:bg-border/50 border border-border transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-accent" />
        <span className="max-w-[120px] truncate">{selectedName}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          <button
            onClick={() => selectOrg(null)}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-card-hover transition-colors ${
              !selectedOrg ? "text-accent font-semibold" : "text-text-muted"
            }`}
          >
            All Organizations
          </button>
          <div className="border-t border-border my-1" />
          {orgs?.map((org) => (
            <button
              key={org.id}
              onClick={() => selectOrg(org)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-card-hover transition-colors ${
                selectedOrg === org.id ? "text-accent font-semibold" : "text-text-muted"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="truncate">{org.name}</span>
                <span className="text-text-dim ml-2 shrink-0">
                  {org.buildingCount}b / {org.userCount}u
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
