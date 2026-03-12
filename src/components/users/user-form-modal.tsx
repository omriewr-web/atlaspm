"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { getCreatableRoles } from "@/lib/permissions";
import type { UserRole } from "@/types";

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  managerId?: string | null;
  assignedProperties?: { buildingId: string; building: { address: string } }[];
  manager?: { id: string; name: string } | null;
}

interface Props {
  user: User | null;
  mode: "create" | "edit";
  onClose: () => void;
  managers?: { id: string; name: string }[];
  buildings?: { id: string; address: string }[];
}

// Roles that need a manager picker
const NEEDS_MANAGER: string[] = ["APM", "LEASING_SPECIALIST", "ACCOUNTING"];
// Roles that need direct building assignment
const NEEDS_BUILDINGS: string[] = ["PM", "OWNER", "BROKER", "SUPER"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ACCOUNT_ADMIN: "Account Admin",
  PM: "Property Manager",
  APM: "Assistant PM",
  COLLECTOR: "Collector",
  OWNER: "Owner",
  LEASING_SPECIALIST: "Leasing Specialist",
  BROKER: "Broker",
  SUPER: "Superintendent",
  ACCOUNTING: "Accounting",
  LEASING_AGENT: "Leasing Agent",
};

export default function UserFormModal({ user, mode, onClose, managers = [], buildings = [] }: Props) {
  const { data: session } = useSession();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const currentRole = (session?.user?.role || "COLLECTOR") as UserRole;
  const creatableRoles = getCreatableRoles(currentRole);

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "COLLECTOR",
    active: true,
    managerId: "" as string,
    buildingIds: [] as string[],
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
        managerId: user.managerId || "",
        buildingIds: user.assignedProperties?.map((p) => p.buildingId) ?? [],
      });
    } else {
      setForm({ name: "", email: "", username: "", password: "", role: "COLLECTOR", active: true, managerId: "", buildingIds: [] });
    }
  }, [user, mode]);

  function handleSave() {
    if (mode === "create") {
      createUser.mutate(
        {
          name: form.name,
          email: form.email,
          username: form.username,
          password: form.password,
          role: form.role,
          managerId: form.managerId || null,
          buildingIds: form.buildingIds,
        },
        { onSuccess: onClose },
      );
    } else if (user) {
      const data: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        managerId: form.managerId || null,
        buildingIds: form.buildingIds,
      };
      if (form.password) data.password = form.password;
      updateUser.mutate({ id: user.id, data }, { onSuccess: onClose });
    }
  }

  const isLoading = createUser.isPending || updateUser.isPending;
  const showManager = NEEDS_MANAGER.includes(form.role);
  const showBuildings = NEEDS_BUILDINGS.includes(form.role);

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
            {creatableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
            ))}
          </select>
        </div>

        {showManager && (
          <div>
            <label className="block text-xs text-text-dim mb-1">Reports To (PM)</label>
            <select
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Select manager...</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {showBuildings && buildings.length > 0 && (
          <div>
            <label className="block text-xs text-text-dim mb-1">
              Assigned Buildings ({form.buildingIds.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto bg-bg border border-border rounded-lg p-2 space-y-1">
              {buildings.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.buildingIds.includes(b.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, buildingIds: [...form.buildingIds, b.id] });
                      } else {
                        setForm({ ...form, buildingIds: form.buildingIds.filter((id) => id !== b.id) });
                      }
                    }}
                    className="rounded"
                  />
                  {b.address}
                </label>
              ))}
            </div>
          </div>
        )}

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
