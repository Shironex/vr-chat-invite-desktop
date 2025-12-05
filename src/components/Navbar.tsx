import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import SettingsModal from "./SettingsModal";
import { ChangelogHistoryDialog } from "./ChangelogHistoryDialog";
import { NetworkStatusIcon } from "./OfflineIndicator";
import { UserAvatarDropdown } from "./inviter/UserAvatarDropdown";
import { Home, History, Circle, BarChart3, Users } from "lucide-react";
import { debugLog } from "@/helpers/debug-logger";
import { cn } from "@/utils/tailwind";

export default function Navbar() {
  const { t } = useTranslation();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  // VRChat process state
  const [isVRChatRunning, setIsVRChatRunning] = useState(false);

  const isActive = (path: string) => currentPath === path;

  // Log route changes
  useEffect(() => {
    debugLog.route(`Navigated to: ${currentPath}`);
  }, [currentPath]);

  // Initialize auth and VRChat process state
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Check auth state
        const state = await window.vrchatAPI.getAuthState();
        setIsAuthenticated(state.isAuthenticated);
        setDisplayName(state.displayName);
        setAvatarUrl(state.avatarUrl);

        // Check VRChat process status (actual check, not cached)
        const processRunning = await window.vrchatAPI.checkVRChatProcess();
        setIsVRChatRunning(processRunning);
      } catch (error) {
        console.error("Failed to initialize navbar state:", error);
      }
    };

    initializeState();
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Auth state changes
    const unsubAuth = window.vrchatAPI.onAuthStateChanged((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setDisplayName(state.displayName);
      setAvatarUrl(state.avatarUrl);
    });

    // Process status changes
    const unsubProcess = window.vrchatAPI.onProcessStatusChanged((isRunning) => {
      setIsVRChatRunning(isRunning);
    });

    return () => {
      unsubAuth();
      unsubProcess();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await window.vrchatAPI.logout();
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Navigation Links */}
        <div className="flex items-center gap-1">
          <Link to="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              title={t("navHome")}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{t("navHome")}</span>
            </Button>
          </Link>
          <Link to="/statistics">
            <Button
              variant={isActive("/statistics") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              title={t("navStatistics")}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{t("navStatistics")}</span>
            </Button>
          </Link>
          <Link to="/history">
            <Button
              variant={isActive("/history") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              title={t("navHistory")}
            >
              <History className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{t("navHistory")}</span>
            </Button>
          </Link>
          <Link to="/instance-monitor">
            <Button
              variant={isActive("/instance-monitor") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              title={t("navInstanceMonitor")}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{t("navInstanceMonitor")}</span>
            </Button>
          </Link>
        </div>

        {/* Right: VRChat Status, Settings, Network, Changelog, User */}
        <div className="flex items-center gap-2">
          {/* VRChat Status Indicator */}
          {isAuthenticated && (
            <div
              className={cn(
                "flex h-9 items-center gap-2 rounded-md border px-2.5 text-xs",
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
          )}

          <NetworkStatusIcon />
          <ChangelogHistoryDialog />
          <SettingsModal />

          {/* User Avatar Dropdown */}
          {isAuthenticated && (
            <UserAvatarDropdown
              displayName={displayName}
              avatarUrl={avatarUrl}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
