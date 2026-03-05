"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: () => toast.error("Failed to update user"),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate user");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
    },
    onError: () => toast.error("Failed to deactivate user"),
  });
}
