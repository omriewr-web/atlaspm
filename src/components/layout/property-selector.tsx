"use client";

import { useAppStore } from "@/stores/app-store";
import { useBuildings, useAllBuildings } from "@/hooks/use-buildings";
import { Info, Plus } from "lucide-react";

export default function PropertySelector() {
  const { selectedBuildingId, setSelectedBuildingId, setDetailBuildingId, openBuildingForm, selectedPortfolio, setSelectedPortfolio } = useAppStore();
  const { data: buildings } = useBuildings();
  const { data: allBuildings } = useAllBuildings();

  // Compute distinct portfolios from all buildings (not filtered)
  const portfolios = [
    ...new Set((allBuildings || []).map((b) => b.portfolio).filter(Boolean)),
  ].sort() as string[];

  // Group filtered buildings by portfolio for optgroup display
  const grouped = new Map<string, typeof buildings>();
  const ungrouped: typeof buildings = [];
  for (const b of buildings || []) {
    if (b.portfolio) {
      if (!grouped.has(b.portfolio)) grouped.set(b.portfolio, []);
      grouped.get(b.portfolio)!.push(b);
    } else {
      ungrouped.push(b);
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Portfolio filter */}
      {portfolios.length > 0 && (
        <select
          value={selectedPortfolio || ""}
          onChange={(e) => setSelectedPortfolio(e.target.value || null)}
          className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">All Portfolios</option>
          {portfolios.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}

      {/* Building selector with optgroups */}
      <div className="flex items-center gap-1.5">
        <select
          value={selectedBuildingId || ""}
          onChange={(e) => setSelectedBuildingId(e.target.value || null)}
          className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">All Properties</option>
          {/* Grouped buildings */}
          {[...grouped.entries()].map(([portfolio, blds]) => (
            <optgroup key={portfolio} label={portfolio}>
              {blds!.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.address}
                </option>
              ))}
            </optgroup>
          ))}
          {/* Ungrouped buildings */}
          {ungrouped.length > 0 && grouped.size > 0 && (
            <optgroup label="No Portfolio">
              {ungrouped.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.address}
                </option>
              ))}
            </optgroup>
          )}
          {/* If no groups exist, show flat list */}
          {grouped.size === 0 &&
            ungrouped.map((b) => (
              <option key={b.id} value={b.id}>
                {b.address}
              </option>
            ))}
        </select>
        {selectedBuildingId && (
          <button
            onClick={() => setDetailBuildingId(selectedBuildingId)}
            className="p-1.5 rounded-lg text-text-dim hover:text-accent hover:bg-card-hover transition-colors"
            title="Building details"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => openBuildingForm()}
          className="p-1.5 rounded-lg text-text-dim hover:text-accent hover:bg-card-hover transition-colors"
          title="Add building"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
