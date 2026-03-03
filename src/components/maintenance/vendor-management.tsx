"use client";

import { useState } from "react";
import { Plus, Trash2, Phone, Mail } from "lucide-react";
import { useVendors, useCreateVendor, useDeleteVendor } from "@/hooks/use-vendors";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import EmptyState from "@/components/ui/empty-state";

export default function VendorManagement() {
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const deleteVendor = useDeleteVendor();
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    specialty: "",
    hourlyRate: "",
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createVendor.mutate(
      {
        name: form.name,
        company: form.company || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        specialty: form.specialty || undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({ name: "", company: "", email: "", phone: "", specialty: "", hourlyRate: "", notes: "" });
        },
      }
    );
  }

  if (isLoading) return <p className="text-text-dim text-sm py-4">Loading vendors…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted">Vendors</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {vendors && vendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vendors.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{v.name}</p>
                  {v.company && <p className="text-xs text-text-dim">{v.company}</p>}
                </div>
                <button
                  onClick={() => deleteVendor.mutate(v.id)}
                  className="text-text-dim hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {v.specialty && (
                <span className="inline-block text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full mb-2">
                  {v.specialty}
                </span>
              )}
              <div className="space-y-1 text-xs text-text-dim">
                {v.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {v.phone}
                  </div>
                )}
                {v.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {v.email}
                  </div>
                )}
                {v.hourlyRate != null && (
                  <p>${v.hourlyRate}/hr</p>
                )}
              </div>
              {v.notes && <p className="text-xs text-text-dim mt-2 line-clamp-2">{v.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No vendors" description="Add vendors to assign to work orders" />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Vendor">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Specialty" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} />
            <Input label="Hourly Rate ($)" type="number" value={form.hourlyRate} onChange={(v) => setForm({ ...form, hourlyRate: v })} />
          </div>
          <div>
            <label className="block text-xs text-text-dim mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={createVendor.isPending || !form.name}>
              {createVendor.isPending ? "Adding…" : "Add Vendor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
      />
    </div>
  );
}
