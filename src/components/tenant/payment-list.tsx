"use client";

import { fmt$, formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useDeletePayment } from "@/hooks/use-payments";

interface Payment {
  id: string;
  amount: string | number;
  date: string;
  method: string | null;
  notes: string | null;
  recorder: { name: string };
  createdAt: string;
}

export default function PaymentList({ payments, tenantId }: { payments: Payment[]; tenantId: string }) {
  const deletePayment = useDeletePayment(tenantId);

  if (payments.length === 0) {
    return <p className="text-text-dim text-sm">No payments recorded</p>;
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between bg-bg/50 rounded-lg px-3 py-2 border border-border/50">
          <div>
            <span className="text-green-400 font-medium text-sm">{fmt$(Number(p.amount))}</span>
            <span className="text-text-dim text-xs ml-2">{formatDate(p.date)}</span>
            {p.method && <span className="text-text-dim text-xs ml-2 capitalize">{p.method}</span>}
            {p.notes && <p className="text-xs text-text-muted mt-0.5">{p.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim">{p.recorder.name}</span>
            <button
              onClick={() => deletePayment.mutate(p.id)}
              className="text-text-dim hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
