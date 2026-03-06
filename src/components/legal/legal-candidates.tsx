"use client";

import { useState } from "react";
import { AlertTriangle, Scale, Loader2 } from "lucide-react";
import { useLegalCandidates, type LegalCandidateItem } from "@/hooks/use-legal-import";
import { useUpsertLegalCase } from "@/hooks/use-legal";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { cn, fmt$ } from "@/lib/utils";

export default function LegalCandidates() {
  const { data, isLoading } = useLegalCandidates();
  const [startingCase, setStartingCase] = useState<string | null>(null);

  const candidates = data?.candidates ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-dim" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return <EmptyState title="No legal referral candidates" icon={Scale} />;
  }

  return (
    <div className="space-y-3">
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
        <p className="text-xs text-orange-400">
          These tenants have significant arrears and collection indicators but are not yet in legal.
          Consider referring them for legal action.
        </p>
      </div>

      <div className="bg-bg border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-dim">Tenant</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-dim">Building</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-dim">Balance</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-dim">Months</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-dim">Score</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-dim">Why</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-dim">Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <CandidateRow key={c.tenantId} candidate={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidateRow({ candidate: c }: { candidate: LegalCandidateItem }) {
  const upsertCase = useUpsertLegalCase(c.tenantId);

  function handleStartCase() {
    upsertCase.mutate(
      { inLegal: true, stage: "NOTICE_SENT" },
    );
  }

  const scoreColor = c.referralScore >= 70 ? "text-red-400" :
    c.referralScore >= 50 ? "text-orange-400" : "text-amber-400";

  return (
    <tr className="border-b border-border/30 hover:bg-card-hover transition-colors">
      <td className="px-3 py-2">
        <span className="text-text-primary text-xs font-medium">{c.name}</span>
        <span className="text-text-dim text-xs ml-1">#{c.unitNumber}</span>
      </td>
      <td className="px-3 py-2 text-xs text-text-dim">{c.buildingAddress}</td>
      <td className="px-3 py-2 text-right text-xs text-red-400 font-mono">{fmt$(c.balance)}</td>
      <td className="px-3 py-2 text-right text-xs text-text-primary font-mono">{c.monthsOwed.toFixed(1)}</td>
      <td className="px-3 py-2 text-right">
        <span className={cn("text-xs font-bold", scoreColor)}>{c.referralScore}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {c.reasons.slice(0, 2).map((r, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{r}</span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2">
        <Button size="sm" onClick={handleStartCase} disabled={upsertCase.isPending}>
          {upsertCase.isPending ? "..." : "Start Case"}
        </Button>
      </td>
    </tr>
  );
}
