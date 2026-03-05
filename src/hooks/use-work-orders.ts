"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkOrderView } from "@/types";
import { useAppStore } from "@/stores/app-store";
import toast from "react-hot-toast";

export function useWorkOrders(filters?: { status?: string; priority?: string; category?: string }) {
  const { selectedBuildingId } = useAppStore();

  return useQuery<WorkOrderView[]>({
    queryKey: ["work-orders", selectedBuildingId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.priority) params.set("priority", filters.priority);
      if (filters?.category) params.set("category", filters.category);
      const res = await fetch(`/api/work-orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch work orders");
      return res.json();
    },
  });
}

export function useWorkOrder(id: string | null) {
  return useQuery({
    queryKey: ["work-orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch work order");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create work order");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order created");
    },
    onError: () => toast.error("Failed to create work order"),
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update work order");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order updated");
    },
    onError: () => toast.error("Failed to update work order"),
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete work order");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order deleted");
    },
    onError: () => toast.error("Failed to delete work order"),
  });
}

export function useCreateWorkOrderComment(workOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { text: string; photos?: string[] }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders", workOrderId] });
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });
}
