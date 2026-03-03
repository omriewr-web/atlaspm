import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

const styles = {
  danger: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", icon: XCircle },
  warning: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", icon: AlertTriangle },
  success: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", icon: CheckCircle },
  info: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", icon: Info },
};

interface AlertBannerProps {
  type?: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
}

export default function AlertBanner({ type = "info", children, className }: AlertBannerProps) {
  const s = styles[type];
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-lg border", s.bg, className)}>
      <s.icon className={cn("w-4 h-4 mt-0.5 shrink-0", s.text)} />
      <div className={cn("text-sm", s.text)}>{children}</div>
    </div>
  );
}
