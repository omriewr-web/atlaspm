"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export interface LeasingActivityView {
  id: string;
  unitId: string;
  buildingId: string;
  type: string;
  description: string | null;
  contactName: string | null;
  contactInfo: string | null;
  createdAt: string;
  userName: string;
  unitNumber: string;
  buildingAddress: string;
}

export function useLeasingActivities(unitId?: string | null, buildingId?: string | null) {
  return useQuery<LeasingActivityView[]>({
    queryKey: ["leasing-activities", unitId, buildingId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unitId) params.set("unitId", unitId);
      if (buildingId) params.set("buildingId", buildingId);
      const res = await fetch(`/api/leasing-activities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leasing activities");
      return res.json();
    },
  });
}

export function useCreateLeasingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      unitId: string;
      buildingId: string;
      type: string;
      description?: string;
      contactName?: string;
      contactInfo?: string;
    }) => {
      const res = await fetch("/api/leasing-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create leasing activity");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leasing-activities"] });
      toast.success("Activity logged");
    },
    onError: () => toast.error("Failed to log activity"),
  });
}
