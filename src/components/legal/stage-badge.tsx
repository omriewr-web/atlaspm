import Badge from "@/components/ui/badge";

const stageInfo: Record<string, { label: string; variant: string }> = {
  NOTICE_SENT: { label: "Notice Sent", variant: "blue" },
  HOLDOVER: { label: "Holdover", variant: "orange" },
  NONPAYMENT: { label: "Nonpayment", variant: "red" },
  COURT_DATE: { label: "Court Date", variant: "purple" },
  STIPULATION: { label: "Stipulation", variant: "amber" },
  JUDGMENT: { label: "Judgment", variant: "red" },
  WARRANT: { label: "Warrant", variant: "red" },
  EVICTION: { label: "Eviction", variant: "red" },
  SETTLED: { label: "Settled", variant: "green" },
};

export default function StageBadge({ stage }: { stage: string }) {
  const { label, variant } = stageInfo[stage] || { label: stage, variant: "gray" };
  return <Badge variant={variant as any}>{label}</Badge>;
}
