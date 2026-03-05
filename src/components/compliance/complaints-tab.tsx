"use client";

import { useViolations } from "@/hooks/use-violations";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatDate } from "@/lib/utils";

export default function ComplaintsTab() {
  const { data: complaints, isLoading } = useViolations({ isComplaint: "true" });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">{complaints?.length || 0} complaints</p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Complaint ID</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Source</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Building</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Unit</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Description</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {complaints?.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                <td className="px-4 py-3 text-text-primary font-mono text-xs">{c.externalId}</td>
                <td className="px-4 py-3 text-text-muted">{c.source}</td>
                <td className="px-4 py-3 text-text-muted truncate max-w-[200px]">{c.buildingAddress}</td>
                <td className="px-4 py-3 text-text-muted">{c.unitNumber || "—"}</td>
                <td className="px-4 py-3 text-text-muted truncate max-w-[300px]">{c.description}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{c.currentStatus || "—"}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.issuedDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!complaints || complaints.length === 0) && (
          <div className="text-center py-12 text-text-dim text-sm">No complaints found</div>
        )}
      </div>
    </div>
  );
}
