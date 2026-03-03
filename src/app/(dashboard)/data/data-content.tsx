"use client";

import { Database, FileDown } from "lucide-react";
import UploadZone from "@/components/data/upload-zone";
import Button from "@/components/ui/button";
import { useExportExcel } from "@/hooks/use-export";

export default function DataContent() {
  const exportExcel = useExportExcel();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Data Management</h1>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text-primary">Import Rent Roll</h3>
        </div>
        <p className="text-xs text-text-dim mb-4">
          Upload an Excel rent roll to create or update tenant records. Existing tenants will be
          updated; new units will be created automatically.
        </p>
        <UploadZone />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-text-primary mb-3">Export Data</h3>
        <p className="text-xs text-text-dim mb-4">
          Download all current tenant data as an Excel spreadsheet.
        </p>
        <Button variant="outline" onClick={exportExcel}>
          <FileDown className="w-4 h-4" /> Export to Excel
        </Button>
      </div>
    </div>
  );
}
