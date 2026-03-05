"use client";

import { useState } from "react";
import { FileDown, Building2, Home, Users, Wrench } from "lucide-react";
import { useBuildings } from "@/hooks/use-buildings";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

const EXPORT_TYPES = [
  { key: "buildings", label: "Buildings", icon: Building2, description: "All buildings with property info, management team, and unit counts." },
  { key: "units", label: "Units", icon: Home, description: "All units with building, tenant, rent, and vacancy info." },
  { key: "tenants", label: "Tenants", icon: Users, description: "All tenants with rent, balance, arrears, lease, and scoring data." },
  { key: "vendors", label: "Vendors", icon: Wrench, description: "All vendors with contact info and rates." },
] as const;

type ExportType = (typeof EXPORT_TYPES)[number]["key"];

export default function ExportTab() {
  const { data: buildings } = useBuildings();
  const [selected, setSelected] = useState<ExportType>("tenants");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("type", selected);
      if (buildingFilter) params.set("buildingId", buildingFilter);
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlaspm-${selected}-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Export to Excel</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {EXPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                selected === t.key
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border text-text-dim hover:border-border-light hover:text-text-muted"
              }`}
            >
              <t.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-text-dim mb-4">
          {EXPORT_TYPES.find((t) => t.key === selected)?.description}
        </p>

        <div className="flex items-center gap-3">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">All Buildings</option>
            {buildings?.map((b) => (
              <option key={b.id} value={b.id}>{b.address}</option>
            ))}
          </select>

          <Button onClick={handleExport} disabled={exporting}>
            <FileDown className="w-4 h-4" />
            {exporting ? "Exporting..." : "Download Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
