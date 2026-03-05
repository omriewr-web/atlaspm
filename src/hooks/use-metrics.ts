"use client";

import { useQuery } from "@tanstack/react-query";
import { PortfolioMetrics } from "@/types";
import { useAppStore } from "@/stores/app-store";

export function useMetrics() {
  const { selectedBuildingId, selectedPortfolio } = useAppStore();

  return useQuery<PortfolioMetrics>({
    queryKey: ["metrics", selectedBuildingId, selectedPortfolio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      if (selectedPortfolio) params.set("portfolio", selectedPortfolio);
      const res = await fetch(`/api/metrics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });
}

export function useDailySummary() {
  const { selectedBuildingId } = useAppStore();

  return useQuery({
    queryKey: ["daily-summary", selectedBuildingId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      const res = await fetch(`/api/metrics/daily-summary?${params}`);
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return res.json();
    },
  });
}
