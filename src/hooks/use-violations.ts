"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ViolationView, ViolationStats } from "@/types";
import { useAppStore } from "@/stores/app-store";
import toast from "react-hot-toast";

export function useViolations(filters?: { source?: string; class?: string; status?: string; isComplaint?: string; dateFrom?: string; dateTo?: string }) {
  const { selectedBuildingId } = useAppStore();

  return useQuery<ViolationView[]>({
    queryKey: ["violations", selectedBuildingId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      if (filters?.source) params.set("source", filters.source);
      if (filters?.class) params.set("class", filters.class);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.isComplaint) params.set("isComplaint", filters.isComplaint);
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.set("dateTo", filters.dateTo);
      const res = await fetch(`/api/violations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch violations");
      return res.json();
    },
  });
}

export function useViolationStats() {
  const { selectedBuildingId } = useAppStore();

  return useQuery<ViolationStats>({
    queryKey: ["violations", "stats", selectedBuildingId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      const res = await fetch(`/api/violations/stats?${params}`);
      if (!res.ok) throw new Error("Failed to fetch violation stats");
      return res.json();
    },
  });
}

export function useSyncViolations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { buildingId?: string; sources?: string[] }) => {
      const res = await fetch("/api/violations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok) throw new Error("Failed to sync violations");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["violations"] });
      toast.success(`Sync complete: ${data.totalNew} new, ${data.totalUpdated} updated`);
    },
    onError: () => toast.error("Failed to sync violations"),
  });
}
