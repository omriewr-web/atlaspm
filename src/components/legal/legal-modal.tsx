"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useLegalCase, useUpsertLegalCase, useCreateLegalNote } from "@/hooks/use-legal";
import StagePipeline from "./stage-pipeline";
import { formatDate } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface Props {
  tenantId: string | null;
  tenantName: string;
  onClose: () => void;
}

export default function LegalModal({ tenantId, tenantName, onClose }: Props) {
  const { data: legalCase, isLoading } = useLegalCase(tenantId);
  const upsertCase = useUpsertLegalCase(tenantId || "");
  const createNote = useCreateLegalNote(tenantId || "");

  const [stage, setStage] = useState("NOTICE_SENT");
  const [caseNumber, setCaseNumber] = useState("");
  const [attorney, setAttorney] = useState("");
  const [filedDate, setFiledDate] = useState("");
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (legalCase) {
      setStage(legalCase.stage || "NOTICE_SENT");
      setCaseNumber(legalCase.caseNumber || "");
      setAttorney(legalCase.attorney || "");
      setFiledDate(legalCase.filedDate ? new Date(legalCase.filedDate).toISOString().split("T")[0] : "");
    }
  }, [legalCase]);

  function handleSave() {
    upsertCase.mutate({
      inLegal: true,
      stage,
      caseNumber: caseNumber || null,
      attorney: attorney || null,
      filedDate: filedDate || null,
    });
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    createNote.mutate({ text: noteText.trim(), stage }, { onSuccess: () => setNoteText("") });
  }

  if (!tenantId) return null;

  return (
    <Modal open={!!tenantId} onClose={onClose} title={`Legal — ${tenantName}`} wide>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-5">
          <StagePipeline currentStage={stage} onSelect={setStage} />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-dim mb-1">Case Number</label>
              <input
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-dim mb-1">Attorney</label>
              <input
                value={attorney}
                onChange={(e) => setAttorney(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-dim mb-1">Filed Date</label>
              <input
                type="date"
                value={filedDate}
                onChange={(e) => setFiledDate(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={upsertCase.isPending}>
            {upsertCase.isPending ? "Saving..." : "Save Case"}
          </Button>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-text-muted mb-3">Legal Notes</h4>
            <div className="space-y-2 mb-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a legal note..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                rows={2}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createNote.isPending}>
                Add Note
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(legalCase?.notes || []).map((n: any) => (
                <div key={n.id} className="border-l-2 border-purple-500 pl-3 py-1">
                  <p className="text-sm text-text-primary">{n.text}</p>
                  <p className="text-xs text-text-dim mt-0.5">
                    {n.author?.name} &middot; {formatDate(n.createdAt)} &middot;{" "}
                    {n.stage?.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
