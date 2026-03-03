"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function usePayments(tenantId: string | null) {
  return useQuery({
    queryKey: ["payments", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/payments`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!tenantId,
  });
}

export function useCreatePayment(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount: number; date: string; method?: string; reference?: string; notes?: string }) => {
      const res = await fetch(`/api/tenants/${tenantId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create payment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Payment recorded");
    },
    onError: () => toast.error("Failed to record payment"),
  });
}

export function useDeletePayment(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/tenants/${tenantId}/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete payment");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}
