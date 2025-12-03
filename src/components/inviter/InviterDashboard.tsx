/**
 * Inviter Dashboard
 * Main dashboard combining all inviter components
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./LoginForm";
import { TwoFactorDialog } from "./TwoFactorDialog";
import { ConnectionStatus } from "./ConnectionStatus";
import { InviterStatsBar } from "./InviterStatsBar";
import { InviterControls } from "./InviterControls";
import { InviterLogs } from "./InviterLogs";
import { cn } from "@/utils/tailwind";

interface LogEntry {
  type: "detect" | "invite" | "skip" | "error" | "auth" | "rate" | "queue" | "system";
  message: string;
  timestamp: number;
  userId?: string;
  displayName?: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

interface InviterDashboardProps {
  onOpenSettings?: () => void;
  className?: string;
}

export function InviterDashboard({ onOpenSettings, className }: InviterDashboardProps) {
  const { t } = useTranslation();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>([]);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // Monitor state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStartingMonitor, setIsStartingMonitor] = useState(false);
  const [isStoppingMonitor, setIsStoppingMonitor] = useState(false);

  // Launcher state
  const [isLaunching, setIsLaunching] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    successful: 0,
    skipped: 0,
    errors: 0,
    queueSize: 0,
  });

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add log entry
  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev.slice(-999), entry]);
  }, []);

  // Check initial auth state, monitor status, stats, and restore logs
  useEffect(() => {
    const initializeState = async () => {
      try {
        // First, restore buffered logs from the main process
        const bufferedLogs = await window.vrchatAPI.getLogBuffer();
        if (bufferedLogs.length > 0) {
          setLogs(bufferedLogs);
        }

        // Check auth state
        const state = await window.vrchatAPI.getAuthState();
        setIsAuthenticated(state.isAuthenticated);
        setDisplayName(state.displayName);

        if (state.isAuthenticated) {
          // Only add session restored message if there are no buffered logs
          // (meaning this is a fresh session, not a navigation)
          if (bufferedLogs.length === 0) {
            addLog({
              type: "auth",
              message: t("msgSessionRestored", { name: state.displayName }),
              timestamp: Date.now(),
            });
          }

          // Also check monitor status and stats if authenticated
          const [monitorStatus, currentStats] = await Promise.all([
            window.vrchatAPI.getMonitorStatus(),
            window.vrchatAPI.getStats(),
          ]);

          setIsMonitoring(monitorStatus.isRunning);
          setStats({
            successful: currentStats.successful,
            skipped: currentStats.skipped,
            errors: currentStats.errors,
            queueSize: currentStats.queueSize,
          });
        }
      } catch (error) {
        console.error("Failed to initialize state:", error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeState();
  }, [addLog, t]);

  // Set up event listeners
  useEffect(() => {
    // Auth state changes
    const unsubAuth = window.vrchatAPI.onAuthStateChanged((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setDisplayName(state.displayName);
    });

    // 2FA required
    const unsub2FA = window.vrchatAPI.on2FARequired((methods) => {
      setTwoFactorMethods(methods);
      setShow2FA(true);
    });

    // Monitor status
    const unsubMonitor = window.vrchatAPI.onMonitorStatusChanged((status) => {
      setIsMonitoring(status.isRunning);
    });

    // Stats updates
    const unsubStats = window.vrchatAPI.onStatsUpdated((newStats) => {
      setStats({
        successful: newStats.successful,
        skipped: newStats.skipped,
        errors: newStats.errors,
        queueSize: newStats.queueSize,
      });
    });

    // Log entries
    const unsubLogs = window.vrchatAPI.onLogEntry((entry) => {
      addLog(entry);
    });

    return () => {
      unsubAuth();
      unsub2FA();
      unsubMonitor();
      unsubStats();
      unsubLogs();
    };
  }, [addLog]);

  // Handle login
  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const result = await window.vrchatAPI.login({ username, password });

      if (result.isAuthenticated) {
        addLog({
          type: "auth",
          message: t("msgLoggedIn", { name: result.displayName }),
          timestamp: Date.now(),
        });
        toast.success(t("msgLoggedIn", { name: result.displayName }));
      } else if (result.requiresTwoFactor) {
        // 2FA dialog will be shown by event listener
      } else {
        setAuthError(t("msgLoginFailed"));
      }
    } catch (error) {
      setAuthError(String(error));
      addLog({
        type: "error",
        message: t("msgLoginError", { error: String(error) }),
        timestamp: Date.now(),
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle 2FA
  const handle2FAVerify = async (method: "totp" | "emailotp" | "otp", code: string) => {
    setTwoFactorError(null);
    setIs2FALoading(true);

    try {
      const result = await window.vrchatAPI.verify2FA({ method, code });

      if (result.isAuthenticated) {
        setShow2FA(false);
        addLog({
          type: "auth",
          message: t("msg2FAVerified", { name: result.displayName }),
          timestamp: Date.now(),
        });
        toast.success(t("msgLoggedIn", { name: result.displayName }));
      } else {
        setTwoFactorError(t("msgInvalidCode"));
      }
    } catch (error) {
      setTwoFactorError(String(error));
    } finally {
      setIs2FALoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await window.vrchatAPI.logout();
    addLog({
      type: "auth",
      message: t("msgLoggedOut"),
      timestamp: Date.now(),
    });
    toast.info(t("msgLoggedOut"));
  };

  // Handle start monitoring
  const handleStartMonitoring = async () => {
    setIsStartingMonitor(true);
    try {
      const started = await window.vrchatAPI.startMonitor();
      if (started) {
        toast.success(t("msgMonitorStarted"));
      } else {
        toast.error(t("msgMonitorStartFailed"));
      }
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setIsStartingMonitor(false);
    }
  };

  // Handle stop monitoring
  const handleStopMonitoring = async () => {
    setIsStoppingMonitor(true);
    try {
      await window.vrchatAPI.stopMonitor();
      toast.info(t("msgMonitorStopped"));
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setIsStoppingMonitor(false);
    }
  };

  // Handle launch VRChat
  const handleLaunchVRChat = async () => {
    setIsLaunching(true);
    try {
      const launched = await window.vrchatAPI.launchVRChat();
      if (launched) {
        toast.success(t("msgVRChatLaunched"));
      } else {
        toast.error(t("msgVRChatLaunchFailed"));
      }
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setIsLaunching(false);
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <>
        <LoginForm
          onLogin={handleLogin}
          isLoading={isAuthLoading}
          error={authError}
          className={className}
        />
        <TwoFactorDialog
          open={show2FA}
          methods={twoFactorMethods}
          onVerify={handle2FAVerify}
          onCancel={() => setShow2FA(false)}
          isLoading={is2FALoading}
          error={twoFactorError}
        />
      </>
    );
  }

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground text-sm">{t("loading")}</div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className={cn("flex h-full flex-col gap-4 p-4", className)}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <ConnectionStatus
          isAuthenticated={isAuthenticated}
          displayName={displayName}
          onLogout={handleLogout}
          className="flex-1"
        />
        {onOpenSettings && (
          <Button variant="outline" size="icon" onClick={onOpenSettings} title={t("settingsRateLimitTitle")}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <InviterStatsBar
        successful={stats.successful}
        skipped={stats.skipped}
        errors={stats.errors}
        queueSize={stats.queueSize}
      />

      {/* Controls */}
      <InviterControls
        isMonitoring={isMonitoring}
        isStarting={isStartingMonitor}
        isStopping={isStoppingMonitor}
        isLaunching={isLaunching}
        onStartMonitoring={handleStartMonitoring}
        onStopMonitoring={handleStopMonitoring}
        onLaunchVRChat={handleLaunchVRChat}
      />

      {/* Logs */}
      <InviterLogs logs={logs} className="flex-1" />

      {/* 2FA Dialog (in case it needs to show again) */}
      <TwoFactorDialog
        open={show2FA}
        methods={twoFactorMethods}
        onVerify={handle2FAVerify}
        onCancel={() => setShow2FA(false)}
        isLoading={is2FALoading}
        error={twoFactorError}
      />
    </div>
  );
}
