"use client";

import { useQuery } from "@tanstack/react-query";
import type { OwnerDashboardDTO } from "@/types";

export function useOwnerDashboard() {
  return useQuery<OwnerDashboardDTO>({
    queryKey: ["owner-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/owner-dashboard");
      if (!res.ok) throw new Error("Failed to fetch owner dashboard");
      return res.json();
    },
  });
}
