import Badge from "@/components/ui/badge";

const map: Record<string, { label: string; variant: string }> = {
  active: { label: "Active", variant: "green" },
  "expiring-soon": { label: "Expiring Soon", variant: "amber" },
  expired: { label: "Expired", variant: "red" },
  "no-lease": { label: "No Lease", variant: "gray" },
  vacant: { label: "Vacant", variant: "gray" },
};

export default function LeaseBadge({ status }: { status: string }) {
  const { label, variant } = map[status] || map.active;
  return <Badge variant={variant as any}>{label}</Badge>;
}
