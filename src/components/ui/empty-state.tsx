import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon = Inbox, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center mb-3">
        <Icon className="w-8 h-8 text-text-dim" />
      </div>
      <h3 className="text-lg font-semibold text-text-muted">{title}</h3>
      {description && <p className="text-sm text-text-dim mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
