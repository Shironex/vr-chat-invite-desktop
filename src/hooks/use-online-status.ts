import { useState, useEffect } from "react";
import { debugLog } from "@/helpers/debug-logger";

/**
 * Hook to detect online/offline status
 *
 * Returns true when online, false when offline
 *
 * Usage:
 * ```tsx
 * const isOnline = useOnlineStatus();
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      debugLog.info("Network: Online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      debugLog.warn("Network: Offline");
      setIsOnline(false);
    };

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
