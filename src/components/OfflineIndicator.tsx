import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff, Wifi } from "lucide-react";
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
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
      title={isOnline ? t("onlineTitle") : t("offlineTitle")}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
      )}
    </div>
  );
}

/**
 * @deprecated Use NetworkStatusIcon instead
 * Kept for backwards compatibility
 */
export function OfflineIndicator() {
  return null;
}
