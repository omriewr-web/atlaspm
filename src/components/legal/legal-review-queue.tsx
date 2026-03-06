"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Search, Loader2 } from "lucide-react";
import Button from "@/components/ui/button";
import { useReviewQueue, useResolveReviewItem, type ReviewQueueItem } from "@/hooks/use-legal-import";
import { useTenants } from "@/hooks/use-tenants";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

export default function LegalReviewQueue() {
  const { data, isLoading } = useReviewQueue();
  const { data: tenants } = useTenants();
  const resolveItem = useResolveReviewItem();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [manualTenantId, setManualTenantId] = useState("");

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-dim" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState title="No cases pending review" icon={CheckCircle} />;
  }

  // Filter tenants for manual matching search
  const filteredTenants = searchTerm.length >= 2
    ? (tenants ?? []).filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.buildingAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  function handleApprove(item: ReviewQueueItem, tenantId?: string) {
    resolveItem.mutate({
      queueId: item.id,
      action: "approve",
      tenantId: tenantId || item.candidateTenantId || undefined,
    });
    setSelectedItem(null);
    setManualTenantId("");
    setSearchTerm("");
  }

  function handleReject(item: ReviewQueueItem) {
    resolveItem.mutate({ queueId: item.id, action: "reject" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {items.length} case{items.length !== 1 ? "s" : ""} pending review
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = selectedItem === item.id;
          const matchStyle = item.matchType === "needs_review"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-red-500/30 bg-red-500/5";

          return (
            <div key={item.id} className={cn("border rounded-lg p-3", matchStyle)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{item.sourceTenantName || "Unknown"}</span>
                    {item.sourceCaseNumber && (
                      <span className="text-xs text-text-dim">Case: {item.sourceCaseNumber}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-dim">
                    {item.sourceAddress}{item.sourceUnit ? ` #${item.sourceUnit}` : ""}
                  </p>
                  {item.candidateTenantName && (
                    <p className="text-xs text-blue-400 mt-1">
                      Best candidate: {item.candidateTenantName}
                      {item.candidateUnitNumber ? ` #${item.candidateUnitNumber}` : ""}
                      {item.candidateBuildingAddress ? ` — ${item.candidateBuildingAddress}` : ""}
                      <span className="text-text-dim ml-1">({(Number(item.matchConfidence) * 100).toFixed(0)}%)</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.candidateTenantId && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      disabled={resolveItem.isPending}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accept Match
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedItem(isExpanded ? null : item.id)}
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Find Tenant
                  </Button>
                  <button
                    onClick={() => handleReject(item)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                    disabled={resolveItem.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Manual tenant search */}
              {isExpanded && (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <input
                    type="text"
                    placeholder="Search by tenant name, unit, or building..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent mb-2"
                  />
                  {filteredTenants.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleApprove(item, t.id)}
                          className="w-full text-left px-3 py-1.5 rounded hover:bg-card-hover text-xs text-text-primary flex justify-between"
                        >
                          <span>{t.name} <span className="text-text-dim">#{t.unitNumber} — {t.buildingAddress}</span></span>
                          <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchTerm.length >= 2 && filteredTenants.length === 0 && (
                    <p className="text-xs text-text-dim text-center py-2">No tenants found</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
