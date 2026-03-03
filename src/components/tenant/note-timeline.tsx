"use client";

import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useDeleteNote } from "@/hooks/use-notes";

const catColors: Record<string, string> = {
  GENERAL: "border-gray-500",
  COLLECTION: "border-blue-500",
  PAYMENT: "border-green-500",
  LEGAL: "border-purple-500",
  LEASE: "border-amber-500",
  MAINTENANCE: "border-orange-500",
};

interface Note {
  id: string;
  text: string;
  category: string;
  createdAt: string;
  author: { name: string };
}

export default function NoteTimeline({ notes, tenantId }: { notes: Note[]; tenantId: string }) {
  const deleteNote = useDeleteNote(tenantId);

  if (notes.length === 0) {
    return <p className="text-text-dim text-sm">No notes yet</p>;
  }

  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.id} className={`border-l-2 ${catColors[n.category] || "border-gray-500"} pl-3 py-1`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{n.text}</p>
              <p className="text-xs text-text-dim mt-1">
                {n.author.name} &middot; {formatDate(n.createdAt)} &middot;{" "}
                <span className="capitalize">{n.category.toLowerCase()}</span>
              </p>
            </div>
            <button
              onClick={() => deleteNote.mutate(n.id)}
              className="text-text-dim hover:text-red-400 shrink-0 mt-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
