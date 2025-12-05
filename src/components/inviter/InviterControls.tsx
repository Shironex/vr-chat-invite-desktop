/**
 * Inviter Controls
 * Start/Stop monitoring and Launch VRChat buttons
 */

import { useTranslation } from "react-i18next";
import { Play, Square, Gamepad2, Loader2 } from "lucide-react";
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
              <span className="hidden sm:inline">{t("controlStopping")}</span>
            </>
          ) : (
            <>
              <Square className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("controlStop")}</span>
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
              <span className="hidden sm:inline">{t("controlStarting")}</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("controlStart")}</span>
            </>
          )}
        </Button>
      )}

      {/* Launch VRChat Button */}
      <Button
        variant="outline"
        onClick={onLaunchVRChat}
        disabled={isLaunching || isVRChatRunning}
        title={t("controlLaunch")}
      >
        {isLaunching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
            <span className="hidden sm:inline">{t("controlLaunching")}</span>
          </>
        ) : (
          <>
            <Gamepad2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("controlLaunch")}</span>
          </>
        )}
      </Button>
    </div>
  );
}
