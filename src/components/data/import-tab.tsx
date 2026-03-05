"use client";

import UploadZone from "@/components/data/upload-zone";

export default function ImportTab() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Import Data</h2>
        <p className="text-xs text-text-dim mb-4">
          Upload Yardi rent roll, AR aging reports, or generic Excel files to import building, unit, and tenant data.
        </p>
        <UploadZone />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Supported Formats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormatCard
            title="Yardi Rent Roll"
            description="Standard rent roll export with unit, tenant, and rent details."
            ext=".xlsx"
          />
          <FormatCard
            title="AR Aging Report"
            description="Accounts receivable aging with balance breakdowns by period."
            ext=".xlsx"
          />
          <FormatCard
            title="Generic Import"
            description="Any spreadsheet with headers matching building/unit/tenant fields."
            ext=".xlsx, .xls, .csv"
          />
        </div>
      </div>
    </div>
  );
}

function FormatCard({ title, description, ext }: { title: string; description: string; ext: string }) {
  return (
    <div className="bg-bg border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-dim mb-2">{description}</p>
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{ext}</span>
    </div>
  );
}
