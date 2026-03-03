"use client";

import { useQuery } from "@tanstack/react-query";
import { BuildingView } from "@/types";

export function useBuildings() {
  return useQuery<BuildingView[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const res = await fetch("/api/buildings");
      if (!res.ok) throw new Error("Failed to fetch buildings");
      return res.json();
    },
  });
}

export function useBuilding(id: string | null) {
  return useQuery({
    queryKey: ["buildings", id],
    queryFn: async () => {
      const res = await fetch(`/api/buildings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch building");
      return res.json();
    },
    enabled: !!id,
  });
}
