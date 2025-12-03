import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import SettingsModal from "./SettingsModal";
import { ChangelogHistoryDialog } from "./ChangelogHistoryDialog";
import { NetworkStatusIcon } from "./OfflineIndicator";
import { Home, History } from "lucide-react";
import { debugLog } from "@/helpers/debug-logger";

export default function Navbar() {
  const { t } = useTranslation();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const isActive = (path: string) => currentPath === path;

  // Log route changes
  useEffect(() => {
    debugLog.route(`Navigated to: ${currentPath}`);
  }, [currentPath]);

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                {t("navHome")}
              </Button>
            </Link>
            <Link to="/history">
              <Button
                variant={isActive("/history") ? "default" : "ghost"}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                {t("navHistory")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Network Status, Changelog & Settings */}
        <div className="flex items-center gap-2">
          <NetworkStatusIcon />
          <ChangelogHistoryDialog />
          <SettingsModal />
        </div>
      </div>
    </nav>
  );
}
