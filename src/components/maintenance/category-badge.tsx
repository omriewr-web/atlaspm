import Badge from "@/components/ui/badge";

const map: Record<string, { label: string; variant: string }> = {
  PLUMBING: { label: "Plumbing", variant: "blue" },
  ELECTRICAL: { label: "Electrical", variant: "amber" },
  HVAC: { label: "HVAC", variant: "purple" },
  APPLIANCE: { label: "Appliance", variant: "orange" },
  GENERAL: { label: "General", variant: "gray" },
  OTHER: { label: "Other", variant: "gray" },
};

export default function CategoryBadge({ category }: { category: string }) {
  const { label, variant } = map[category] || map.GENERAL;
  return <Badge variant={variant as any}>{label}</Badge>;
}
