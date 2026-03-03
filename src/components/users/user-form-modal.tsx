"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
}

interface Props {
  user: User | null;
  mode: "create" | "edit";
  onClose: () => void;
}

export default function UserFormModal({ user, mode, onClose }: Props) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "COLLECTOR",
    active: true,
  });

  useEffect(() => {
    if (user && mode === "edit") {
      setForm({
        name: user.name,
        email: user.email,
        username: user.username,
        password: "",
        role: user.role,
        active: user.active,
      });
    } else {
      setForm({ name: "", email: "", username: "", password: "", role: "COLLECTOR", active: true });
    }
  }, [user, mode]);

  function handleSave() {
    if (mode === "create") {
      createUser.mutate(form, { onSuccess: onClose });
    } else if (user) {
      const data: any = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.password) data.password = form.password;
      updateUser.mutate({ id: user.id, data }, { onSuccess: onClose });
    }
  }

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <Modal open={!!user || mode === "create"} onClose={onClose} title={mode === "create" ? "Create User" : "Edit User"}>
      <div className="space-y-3">
        <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <InputField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
        {mode === "create" && (
          <InputField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
        )}
        <InputField
          label={mode === "create" ? "Password" : "New Password (leave blank to keep)"}
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          type="password"
        />
        <div>
          <label className="block text-xs text-text-dim mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="ADMIN">Admin</option>
            <option value="PM">Property Manager</option>
            <option value="COLLECTOR">Collector</option>
            <option value="OWNER">Owner</option>
            <option value="BROKER">Broker</option>
          </select>
        </div>
        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded"
            />
            Active
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InputField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
      />
    </div>
  );
}
