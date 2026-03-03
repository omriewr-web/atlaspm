"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  color?: string;
  className?: string;
}

export default function StatCard({ label, value, subtext, icon: Icon, color, className }: StatCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-dim uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1" style={color ? { color } : undefined}>
            {value}
          </p>
          {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-accent/10">
            <Icon className="w-5 h-5 text-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
