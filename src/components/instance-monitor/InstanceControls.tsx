/**
 * Instance Controls
 * Start/Stop monitoring buttons
 */

import { useTranslation } from "react-i18next";
import { Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

interface InstanceControlsProps {
  isMonitoring: boolean;
  isStarting?: boolean;
  isStopping?: boolean;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  className?: string;
}

export function InstanceControls({
  isMonitoring,
  isStarting = false,
  isStopping = false,
  onStartMonitoring,
  onStopMonitoring,
  className,
}: InstanceControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex gap-2 sm:gap-3", className)}>
      {/* Monitor Button */}
      {isMonitoring ? (
        <Button
          variant="destructive"
          onClick={onStopMonitoring}
          disabled={isStopping}
          className="flex-1"
        >
          {isStopping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              <span className="hidden sm:inline">{t("instanceStopMonitor")}</span>
            </>
          ) : (
            <>
              <Square className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("instanceStopMonitor")}</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="default"
          onClick={onStartMonitoring}
          disabled={isStarting}
          className="flex-1"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              <span className="hidden sm:inline">{t("instanceStartMonitor")}</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("instanceStartMonitor")}</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
