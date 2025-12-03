/**
 * Inviter Controls
 * Start/Stop monitoring and Launch VRChat buttons
 */

import { useTranslation } from "react-i18next";
import { Play, Square, Gamepad2, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

interface InviterControlsProps {
  isMonitoring: boolean;
  isStarting?: boolean;
  isStopping?: boolean;
  isLaunching?: boolean;
  isVRChatRunning?: boolean;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onLaunchVRChat: () => void;
  className?: string;
}

export function InviterControls({
  isMonitoring,
  isStarting = false,
  isStopping = false,
  isLaunching = false,
  isVRChatRunning = false,
  onStartMonitoring,
  onStopMonitoring,
  onLaunchVRChat,
  className,
}: InviterControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex gap-3", className)}>
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("controlStopping")}
            </>
          ) : (
            <>
              <Square className="mr-2 h-4 w-4" />
              {t("controlStop")}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("controlStarting")}
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {t("controlStart")}
            </>
          )}
        </Button>
      )}

      {/* Launch VRChat Button */}
      <Button
        variant="outline"
        onClick={onLaunchVRChat}
        disabled={isLaunching || isVRChatRunning}
      >
        {isLaunching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("controlLaunching")}
          </>
        ) : (
          <>
            <Gamepad2 className="mr-2 h-4 w-4" />
            {t("controlLaunch")}
          </>
        )}
      </Button>

      {/* VRChat Status Indicator */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          isVRChatRunning
            ? "border-green-500/50 bg-green-500/10 text-green-500"
            : "border-muted text-muted-foreground"
        )}
        title={isVRChatRunning ? t("statusVRChatRunning") : t("statusVRChatNotRunning")}
      >
        <Circle
          className={cn(
            "h-2 w-2",
            isVRChatRunning ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground"
          )}
        />
        <span className="hidden sm:inline">
          {isVRChatRunning ? t("statusVRChatRunning") : t("statusVRChatNotRunning")}
        </span>
      </div>
    </div>
  );
}
