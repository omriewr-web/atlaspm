"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder, useCreateWorkOrderComment } from "@/hooks/use-work-orders";
import { useVendors } from "@/hooks/use-vendors";
import { useUsers } from "@/hooks/use-users";
import PriorityBadge from "./priority-badge";
import CategoryBadge from "./category-badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { fmt$, formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const STATUSES = ["OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const CATEGORIES = ["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "GENERAL", "OTHER"] as const;

interface Props {
  workOrderId: string | null;
  onClose: () => void;
}

export default function WorkOrderDetailModal({ workOrderId, onClose }: Props) {
  const { data: wo, isLoading } = useWorkOrder(workOrderId);
  const updateWO = useUpdateWorkOrder();
  const deleteWO = useDeleteWorkOrder();
  const { data: vendors } = useVendors();
  const { data: users } = useUsers();

  const [tab, setTab] = useState<"details" | "comments">("details");
  const [commentText, setCommentText] = useState("");
  const addComment = useCreateWorkOrderComment(workOrderId || "");

  const [form, setForm] = useState({
    status: "OPEN" as string,
    priority: "MEDIUM" as string,
    category: "GENERAL" as string,
    vendorId: "",
    assignedToId: "",
    estimatedCost: "",
    actualCost: "",
    scheduledDate: "",
  });

  useEffect(() => {
    if (wo) {
      setForm({
        status: wo.status,
        priority: wo.priority,
        category: wo.category,
        vendorId: wo.vendorId || "",
        assignedToId: wo.assignedToId || "",
        estimatedCost: wo.estimatedCost ? String(Number(wo.estimatedCost)) : "",
        actualCost: wo.actualCost ? String(Number(wo.actualCost)) : "",
        scheduledDate: wo.scheduledDate ? new Date(wo.scheduledDate).toISOString().split("T")[0] : "",
      });
    }
  }, [wo]);

  function handleSave() {
    if (!workOrderId) return;
    updateWO.mutate({
      id: workOrderId,
      data: {
        status: form.status,
        priority: form.priority,
        category: form.category,
        vendorId: form.vendorId || null,
        assignedToId: form.assignedToId || null,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
        actualCost: form.actualCost ? parseFloat(form.actualCost) : null,
        scheduledDate: form.scheduledDate || null,
      },
    });
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    addComment.mutate({ text: commentText.trim() }, { onSuccess: () => setCommentText("") });
  }

  function handleDelete() {
    if (!workOrderId) return;
    deleteWO.mutate(workOrderId, { onSuccess: onClose });
  }

  if (!workOrderId) return null;

  return (
    <Modal open={!!workOrderId} onClose={onClose} title={wo?.title || "Work Order"} wide>
      {isLoading ? (
        <LoadingSpinner />
      ) : wo ? (
        <div>
          <div className="flex gap-1 border-b border-border mb-4">
            {(["details", "comments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "text-accent border-b-2 border-accent" : "text-text-dim hover:text-text-muted"
                }`}
              >
                {t}{t === "comments" && wo.comments?.length ? ` (${wo.comments.length})` : ""}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <div className="space-y-4">
              <div className="bg-bg/50 rounded-lg p-3 border border-border/50">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{wo.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Field label="Building" value={wo.building?.address} />
                <Field label="Unit" value={wo.unit?.unitNumber || "—"} />
                <Field label="Tenant" value={wo.tenant?.name || "—"} />
                <Field label="Created" value={formatDate(wo.createdAt)} />
                <Field label="Created By" value={wo.createdBy?.name || "—"} />
                {wo.completedDate && <Field label="Completed" value={formatDate(wo.completedDate)} />}
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-dim mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Scheduled Date</label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Vendor</label>
                  <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">None</option>
                    {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}{v.company ? ` — ${v.company}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Assigned To</label>
                  <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">Unassigned</option>
                    {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Estimated Cost</label>
                  <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} placeholder="0.00" className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">Actual Cost</label>
                  <input type="number" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} placeholder="0.00" className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
                <Button onClick={handleSave} disabled={updateWO.isPending}>
                  {updateWO.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {tab === "comments" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                  rows={3}
                />
                <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending}>
                  {addComment.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </div>

              <div className="space-y-3">
                {(wo.comments || []).length === 0 ? (
                  <p className="text-text-dim text-sm">No comments yet</p>
                ) : (
                  wo.comments.map((c: any) => (
                    <div key={c.id} className="border-l-2 border-accent pl-3 py-1">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{c.text}</p>
                      <p className="text-xs text-text-dim mt-1">
                        {c.author?.name} &middot; {formatDate(c.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="text-text-dim">{label}</span>
      <p className="text-text-primary">{value || "—"}</p>
    </div>
  );
}
