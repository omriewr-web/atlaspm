"use client";

import { cn } from "@/lib/utils";

const STAGES = [
  "NOTICE_SENT", "HOLDOVER", "NONPAYMENT", "COURT_DATE",
  "STIPULATION", "JUDGMENT", "WARRANT", "EVICTION", "SETTLED",
];

const LABELS: Record<string, string> = {
  NOTICE_SENT: "Notice",
  HOLDOVER: "Holdover",
  NONPAYMENT: "Nonpay",
  COURT_DATE: "Court",
  STIPULATION: "Stip",
  JUDGMENT: "Judgment",
  WARRANT: "Warrant",
  EVICTION: "Eviction",
  SETTLED: "Settled",
};

interface Props {
  currentStage: string;
  onSelect?: (stage: string) => void;
}

export default function StagePipeline({ currentStage, onSelect }: Props) {
  const currentIdx = STAGES.indexOf(currentStage);

  return (
    <div className="flex gap-0.5 overflow-x-auto">
      {STAGES.map((stage, i) => (
        <button
          key={stage}
          onClick={() => onSelect?.(stage)}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap",
            i <= currentIdx
              ? stage === "SETTLED"
                ? "bg-green-500/20 text-green-400"
                : "bg-accent/20 text-accent"
              : "bg-border/30 text-text-dim",
            onSelect && "hover:opacity-80 cursor-pointer"
          )}
        >
          {LABELS[stage]}
        </button>
      ))}
    </div>
  );
}
