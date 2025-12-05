/**
 * Instance Stats Bar
 * Shows current world and join/leave/world change counts
 */

import { useTranslation } from "react-i18next";
import { UserPlus, UserMinus, Globe, MapPin } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  className?: string;
  isLarge?: boolean;
}

function StatCard({ icon, label, value, color, className, isLarge = false }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 hover:bg-muted flex flex-col items-center gap-1 rounded-lg p-2 sm:p-3 transition-colors",
        isLarge && "col-span-2",
        className
      )}
    >
      <div className={cn("flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs", color)}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {typeof value === "number" ? (
        <span className="text-xl sm:text-2xl font-bold tabular-nums">{value}</span>
      ) : (
        <span className="text-sm sm:text-base font-medium truncate max-w-full">{value}</span>
      )}
    </div>
  );
}

interface InstanceStatsBarProps {
  playersJoined: number;
  playersLeft: number;
  worldChanges: number;
  currentWorld: string | null;
  className?: string;
}

export function InstanceStatsBar({
  playersJoined,
  playersLeft,
  worldChanges,
  currentWorld,
  className,
}: InstanceStatsBarProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3", className)}>
      {/* Current World - spans 2 columns */}
      <StatCard
        icon={<MapPin className="h-4 w-4" />}
        label={t("instanceCurrentWorld")}
        value={currentWorld || t("instanceNoWorld")}
        color="text-blue-500"
        className="col-span-2"
      />

      <StatCard
        icon={<UserPlus className="h-4 w-4" />}
        label={t("instanceJoined")}
        value={playersJoined}
        color="text-green-500"
      />
      <StatCard
        icon={<UserMinus className="h-4 w-4" />}
        label={t("instanceLeft")}
        value={playersLeft}
        color="text-red-500"
      />
      <StatCard
        icon={<Globe className="h-4 w-4" />}
        label={t("instanceWorldChanges")}
        value={worldChanges}
        color="text-purple-500"
      />
    </div>
  );
}
