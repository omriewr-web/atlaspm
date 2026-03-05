"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComplianceItemView } from "@/types";
import { useAppStore } from "@/stores/app-store";
import toast from "react-hot-toast";

export function useComplianceItems(filters?: { category?: string; status?: string; frequency?: string }) {
  const { selectedBuildingId } = useAppStore();

  return useQuery<ComplianceItemView[]>({
    queryKey: ["compliance", selectedBuildingId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      if (filters?.category) params.set("category", filters.category);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.frequency) params.set("frequency", filters.frequency);
      const res = await fetch(`/api/compliance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch compliance items");
      return res.json();
    },
  });
}

export function useCreateComplianceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create compliance item");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      toast.success("Compliance item created");
    },
    onError: () => toast.error("Failed to create compliance item"),
  });
}

export function useUpdateComplianceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/compliance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update compliance item");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      toast.success("Compliance item updated");
    },
    onError: () => toast.error("Failed to update compliance item"),
  });
}

export function useDeleteComplianceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compliance/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      toast.success("Compliance item deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete compliance item"),
  });
}

export function useGenerateComplianceDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (buildingId: string) => {
      const res = await fetch("/api/compliance/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      });
      if (!res.ok) throw new Error("Failed to generate defaults");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to generate compliance defaults"),
  });
}
