import Badge from "@/components/ui/badge";

const map: Record<string, { label: string; variant: string }> = {
  current: { label: "Current", variant: "green" },
  "30": { label: "30 Days", variant: "blue" },
  "60": { label: "60 Days", variant: "amber" },
  "90": { label: "90 Days", variant: "orange" },
  "120+": { label: "120+ Days", variant: "red" },
  vacant: { label: "Vacant", variant: "gray" },
};

export default function ArrearsBadge({ category }: { category: string }) {
  const { label, variant } = map[category] || map.current;
  return <Badge variant={variant as any}>{label}</Badge>;
}
