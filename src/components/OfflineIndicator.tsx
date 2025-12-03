import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Offline Indicator Component
 *
 * Shows a toast notification when the app goes offline/online
 * Uses i18next for internationalized messages
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      toast.error(t("offlineTitle"), {
        description: t("offlineDescription"),
        icon: <WifiOff className="h-4 w-4" />,
        duration: Infinity, // Keep the toast until dismissed or back online
        id: "offline-status", // Prevent duplicate toasts
      });
    } else {
      // Dismiss the offline toast when back online
      toast.dismiss("offline-status");

      // Show a brief success toast
      toast.success(t("onlineTitle"), {
        description: t("onlineDescription"),
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
    }
  }, [isOnline, t]);

  return null; // This component only manages toasts, no UI
}
