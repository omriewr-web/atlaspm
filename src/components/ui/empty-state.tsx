import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon = Inbox, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-text-dim mb-3" />
      <h3 className="text-text-muted font-medium">{title}</h3>
      {description && <p className="text-sm text-text-dim mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
