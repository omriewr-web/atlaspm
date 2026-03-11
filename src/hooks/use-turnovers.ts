"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export interface TurnoverView {
  id: string;
  unitId: string;
  buildingId: string;
  triggeredBy: string;
  moveOutDate: string | null;
  moveOutSource: string | null;
  status: string;
  inspectionDate: string | null;
  inspectionNotes: string | null;
  inspectionChecklist: any;
  scopeOfWork: string | null;
  estimatedCost: number | null;
  listedDate: string | null;
  completedAt: string | null;
  assignedToUserId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  unit: { unitNumber: string };
  building: { address: string };
  assignedTo: { id: string; name: string } | null;
  vendorAssignments: {
    id: string;
    trade: string;
    vendorName: string;
    status: string;
    cost: number | null;
  }[];
}

export interface TurnoverDetail extends Omit<TurnoverView, "vendorAssignments"> {
  vendorAssignments: {
    id: string;
    trade: string;
    vendorName: string;
    vendorId: string | null;
    status: string;
    scheduledDate: string | null;
    completedDate: string | null;
    cost: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    vendor: { id: string; name: string; company: string | null } | null;
  }[];
}

export function useTurnovers(filters?: { status?: string; buildingId?: string }) {
  return useQuery<TurnoverView[]>({
    queryKey: ["turnovers", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.buildingId) params.set("buildingId", filters.buildingId);
      const res = await fetch(`/api/turnovers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch turnovers");
      return res.json();
    },
  });
}

export function useTurnover(id: string | null) {
  return useQuery<TurnoverDetail>({
    queryKey: ["turnovers", id],
    queryFn: async () => {
      const res = await fetch(`/api/turnovers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch turnover");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateTurnover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { unitId: string; buildingId: string; moveOutDate?: string; moveOutSource?: string; assignedToUserId?: string }) => {
      const res = await fetch("/api/turnovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create turnover");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnovers"] });
      toast.success("Turnover workflow created");
    },
    onError: () => toast.error("Failed to create turnover"),
  });
}

export function useUpdateTurnover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/turnovers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update turnover");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnovers"] });
      toast.success("Turnover updated");
    },
    onError: () => toast.error("Failed to update turnover"),
  });
}

export function useAddVendorAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turnoverId, ...data }: { turnoverId: string; vendorName: string; trade: string; vendorId?: string; scheduledDate?: string; cost?: number; notes?: string }) => {
      const res = await fetch(`/api/turnovers/${turnoverId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add vendor");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnovers"] });
      toast.success("Vendor assigned");
    },
    onError: () => toast.error("Failed to assign vendor"),
  });
}

export function useUpdateVendorAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turnoverId, assignmentId, ...data }: { turnoverId: string; assignmentId: string; [key: string]: any }) => {
      const res = await fetch(`/api/turnovers/${turnoverId}/vendors/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update vendor assignment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnovers"] });
      toast.success("Vendor assignment updated");
    },
    onError: () => toast.error("Failed to update vendor assignment"),
  });
}
