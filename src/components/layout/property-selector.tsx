"use client";

import { useAppStore } from "@/stores/app-store";
import { useBuildings } from "@/hooks/use-buildings";

export default function PropertySelector() {
  const { selectedBuildingId, setSelectedBuildingId } = useAppStore();
  const { data: buildings } = useBuildings();

  return (
    <select
      value={selectedBuildingId || ""}
      onChange={(e) => setSelectedBuildingId(e.target.value || null)}
      className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
    >
      <option value="">All Properties</option>
      {buildings?.map((b) => (
        <option key={b.id} value={b.id}>
          {b.address}
        </option>
      ))}
    </select>
  );
}
