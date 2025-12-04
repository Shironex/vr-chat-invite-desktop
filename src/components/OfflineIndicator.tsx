import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

/**
 * Network Status Icon Component
 *
 * Shows a small icon indicating online/offline status
 * Green wifi icon when online, red wifi-off icon when offline
 */
export function NetworkStatusIcon({ className }: { className?: string }) {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("cursor-default", className)}
      title={isOnline ? t("onlineTitle") : t("offlineTitle")}
    >
      {isOnline ? (
        <Wifi className="h-5 w-5 text-green-500" />
      ) : (
        <WifiOff className="h-5 w-5 text-red-500 animate-pulse" />
      )}
    </Button>
  );
}

/**
 * @deprecated Use NetworkStatusIcon instead
 * Kept for backwards compatibility
 */
export function OfflineIndicator() {
  return null;
}
