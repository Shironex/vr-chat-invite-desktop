/**
 * Connection Status
 * Shows auth status and connected user info
 */

import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { VRCHAT_GROUP } from "@/config/vrchat.config";

interface ConnectionStatusProps {
  isAuthenticated: boolean;
  isLoading?: boolean;
  displayName?: string;
  onLogout: () => void;
  className?: string;
}

export function ConnectionStatus({
  isAuthenticated,
  isLoading = false,
  displayName,
  onLogout,
  className,
}: ConnectionStatusProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        isAuthenticated ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
        ) : isAuthenticated ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}

        {/* Status Text */}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isLoading
              ? t("statusConnecting")
              : isAuthenticated
                ? t("statusConnected", { name: displayName || "Unknown" })
                : t("statusNotConnected")}
          </span>
          {isAuthenticated && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              {t("statusGroup", { name: VRCHAT_GROUP.GROUP_NAME })}
            </span>
          )}
        </div>
      </div>

      {/* Logout Button */}
      {isAuthenticated && (
        <Button variant="ghost" size="sm" onClick={onLogout} className="h-8">
          <LogOut className="mr-1 h-4 w-4" />
          {t("statusLogout")}
        </Button>
      )}
    </div>
  );
}
