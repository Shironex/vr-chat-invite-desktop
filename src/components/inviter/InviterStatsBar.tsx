/**
 * Inviter Stats Bar
 * Shows stats cards for invites sent, skipped, errors, and queue size
 * Adapted from AG-Wypalarka StatsBar.tsx
 */

import { useTranslation } from "react-i18next";
import { CheckCircle2, SkipForward, XCircle, ClipboardList } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  className?: string;
}

function StatCard({ icon, label, value, color, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 hover:bg-muted flex flex-1 flex-col items-center gap-1 rounded-lg p-3 transition-colors",
        className
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs", color)}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

interface InviterStatsBarProps {
  successful: number;
  skipped: number;
  errors: number;
  queueSize: number;
  className?: string;
}

export function InviterStatsBar({
  successful,
  skipped,
  errors,
  queueSize,
  className,
}: InviterStatsBarProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex gap-3", className)}>
      <StatCard
        icon={<CheckCircle2 className="h-4 w-4" />}
        label={t("statsSent")}
        value={successful}
        color="text-green-500"
      />
      <StatCard
        icon={<SkipForward className="h-4 w-4" />}
        label={t("statsSkipped")}
        value={skipped}
        color="text-yellow-500"
      />
      <StatCard
        icon={<XCircle className="h-4 w-4" />}
        label={t("statsErrors")}
        value={errors}
        color="text-red-500"
      />
      <StatCard
        icon={<ClipboardList className="h-4 w-4" />}
        label={t("statsQueue")}
        value={queueSize}
        color="text-cyan-500"
      />
    </div>
  );
}
