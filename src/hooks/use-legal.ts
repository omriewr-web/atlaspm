"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useLegalCase(tenantId: string | null) {
  return useQuery({
    queryKey: ["legal", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/legal`);
      if (!res.ok) throw new Error("Failed to fetch legal case");
      return res.json();
    },
    enabled: !!tenantId,
  });
}

export function useUpsertLegalCase(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tenants/${tenantId}/legal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update legal case");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Legal case updated");
    },
    onError: () => toast.error("Failed to update legal case"),
  });
}

export function useCreateLegalNote(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { text: string; stage: string }) => {
      const res = await fetch(`/api/tenants/${tenantId}/legal/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add legal note");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal", tenantId] });
      toast.success("Legal note added");
    },
    onError: () => toast.error("Failed to add legal note"),
  });
}
