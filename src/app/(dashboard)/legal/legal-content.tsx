"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { useTenants } from "@/hooks/use-tenants";
import StatCard from "@/components/ui/stat-card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import StageBadge from "@/components/legal/stage-badge";
import LegalModal from "@/components/legal/legal-modal";
import { fmt$, formatDate } from "@/lib/utils";
import { TenantView } from "@/types";

const STAGES = [
  "NOTICE_SENT", "HOLDOVER", "NONPAYMENT", "COURT_DATE",
  "STIPULATION", "JUDGMENT", "WARRANT", "EVICTION", "SETTLED",
];

export default function LegalContent() {
  const { data: tenants, isLoading } = useTenants();
  const [selectedTenant, setSelectedTenant] = useState<TenantView | null>(null);

  const legalTenants = useMemo(
    () => (tenants || []).filter((t) => t.legalFlag),
    [tenants]
  );

  const recommended = useMemo(
    () => (tenants || []).filter((t) => t.legalRecommended && !t.legalFlag),
    [tenants]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s] = 0));
    legalTenants.forEach((t) => {
      const stage = t.legalStage?.toUpperCase().replace(/-/g, "_") || "NOTICE_SENT";
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [legalTenants]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Legal Cases</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Cases" value={legalTenants.length} icon={Scale} color="#8B5CF6" />
        <StatCard label="Recommended" value={recommended.length} color="#F97316" />
        <StatCard label="Total Balance (Legal)" value={fmt$(legalTenants.reduce((s, t) => s + t.balance, 0))} color="#EF4444" />
        <StatCard label="In Court+" value={stageCounts.COURT_DATE + stageCounts.STIPULATION + stageCounts.JUDGMENT + stageCounts.WARRANT + stageCounts.EVICTION} color="#8B5CF6" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {STAGES.map((s) => (
          <div key={s} className="bg-card border border-border rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-lg font-bold text-text-primary">{stageCounts[s]}</p>
            <p className="text-[10px] text-text-dim uppercase">{s.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>

      {legalTenants.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Tenant</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Building</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Balance</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Stage</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {legalTenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="px-3 py-2">
                    <span className="text-text-primary">{t.name}</span>
                    <span className="text-text-dim text-xs ml-1">#{t.unitNumber}</span>
                  </td>
                  <td className="px-3 py-2 text-text-muted text-xs">{t.buildingAddress}</td>
                  <td className="px-3 py-2 text-right text-red-400 font-mono">{fmt$(t.balance)}</td>
                  <td className="px-3 py-2">
                    <StageBadge stage={t.legalStage?.toUpperCase().replace(/-/g, "_") || "NOTICE_SENT"} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelectedTenant(t)}
                      className="text-xs text-accent hover:text-accent-light"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No active legal cases" icon={Scale} />
      )}

      {recommended.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-3">Recommended for Legal ({recommended.length})</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Tenant</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Balance</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Score</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {recommended.slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                    <td className="px-3 py-2">
                      <span className="text-text-primary">{t.name}</span>
                      <span className="text-text-dim text-xs ml-1">#{t.unitNumber} — {t.buildingAddress}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-red-400 font-mono">{fmt$(t.balance)}</td>
                    <td className="px-3 py-2 text-right text-orange-400 font-mono font-bold">{t.collectionScore}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedTenant(t)}
                        className="text-xs text-accent hover:text-accent-light"
                      >
                        Start Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LegalModal
        tenantId={selectedTenant?.id || null}
        tenantName={selectedTenant?.name || ""}
        onClose={() => setSelectedTenant(null)}
      />
    </div>
  );
}
