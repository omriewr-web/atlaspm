"use client";

import { useAppStore } from "@/stores/app-store";
import { useExportExcel } from "@/hooks/use-export";
import Button from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function BulkActionsBar() {
  const { selectedTenantIds, deselectAll } = useAppStore();
  const exportExcel = useExportExcel();

  if (selectedTenantIds.size === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2">
      <span className="text-sm text-accent font-medium">{selectedTenantIds.size} selected</span>
      <Button variant="outline" size="sm" onClick={exportExcel}>
        <Download className="w-3.5 h-3.5" /> Export
      </Button>
      <div className="flex-1" />
      <button onClick={deselectAll} className="text-text-dim hover:text-text-muted">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
