import Badge from "@/components/ui/badge";

const map: Record<string, { label: string; variant: string }> = {
  URGENT: { label: "Urgent", variant: "red" },
  HIGH: { label: "High", variant: "orange" },
  MEDIUM: { label: "Medium", variant: "amber" },
  LOW: { label: "Low", variant: "blue" },
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const { label, variant } = map[priority] || map.MEDIUM;
  return <Badge variant={variant as any}>{label}</Badge>;
}
