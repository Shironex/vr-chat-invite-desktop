/**
 * Instance Monitor Dashboard
 * Main dashboard combining all instance monitoring components
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { InstanceStatsBar } from "./InstanceStatsBar";
import { InstanceControls } from "./InstanceControls";
import { InstanceLogs } from "./InstanceLogs";
import { cn } from "@/utils/tailwind";
import type { InstanceLogEntry, InstanceMonitorStats } from "@/helpers/vrchat/vrchat-types";

interface InstanceMonitorDashboardProps {
  className?: string;
}

export function InstanceMonitorDashboard({ className }: InstanceMonitorDashboardProps) {
  const { t } = useTranslation();

  // Monitor state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStartingMonitor, setIsStartingMonitor] = useState(false);
  const [isStoppingMonitor, setIsStoppingMonitor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<InstanceMonitorStats>({
    playersJoined: 0,
    playersLeft: 0,
    worldChanges: 0,
  });

  // Current world state
  const [currentWorld, setCurrentWorld] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<InstanceLogEntry[]>([]);

  // Add log entry
  const addLog = useCallback((entry: InstanceLogEntry) => {
    setLogs((prev) => [...prev.slice(-999), entry]);
  }, []);

  // Initialize state on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Restore buffered logs
        const bufferedLogs = await window.instanceMonitorAPI.getLogBuffer();
        if (bufferedLogs.length > 0) {
          setLogs(bufferedLogs);
        }

        // Get current monitor status and stats
        const [monitorStatus, currentStats] = await Promise.all([
          window.instanceMonitorAPI.getMonitorStatus(),
          window.instanceMonitorAPI.getStats(),
        ]);

        setIsMonitoring(monitorStatus.isRunning);
        setCurrentWorld(monitorStatus.currentWorld);
        setStats(currentStats);

        // Check if user is logged in to VRChat and set local user for world transition detection
        try {
          const authState = await window.vrchatAPI.getAuthState();
          if (authState.isAuthenticated && authState.displayName) {
            await window.instanceMonitorAPI.setLocalUser(authState.displayName);
          }
        } catch {
          // Auth check is optional, instance monitor works without it
        }
      } catch (error) {
        console.error("Failed to initialize instance monitor state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Monitor status changes
    const unsubMonitor = window.instanceMonitorAPI.onMonitorStatusChanged((status) => {
      setIsMonitoring(status.isRunning);
      setCurrentWorld(status.currentWorld);
    });

    // Stats updates
    const unsubStats = window.instanceMonitorAPI.onStatsUpdated((newStats) => {
      setStats(newStats);
    });

    // Log entries
    const unsubLogs = window.instanceMonitorAPI.onLogEntry((entry) => {
      addLog(entry);
    });

    // Instance events (for world changes)
    const unsubEvents = window.instanceMonitorAPI.onInstanceEvent((event) => {
      if (event.type === "world_enter") {
        setCurrentWorld(event.worldName || null);
      }
    });

    // Auth state changes - update local user for world transition detection
    const unsubAuth = window.vrchatAPI.onAuthStateChanged((state) => {
      if (state.isAuthenticated && state.displayName) {
        window.instanceMonitorAPI.setLocalUser(state.displayName);
      } else {
        window.instanceMonitorAPI.setLocalUser(null);
      }
    });

    return () => {
      unsubMonitor();
      unsubStats();
      unsubLogs();
      unsubEvents();
      unsubAuth();
    };
  }, [addLog]);

  // Handle start monitoring
  const handleStartMonitoring = async () => {
    setIsStartingMonitor(true);
    try {
      // Check if VRChat is running
      const processRunning = await window.instanceMonitorAPI.checkVRChatProcess();

      if (!processRunning) {
        addLog({
          type: "system",
          message: t("msgVRChatNotRunning"),
          timestamp: Date.now(),
          i18nKey: "instanceVRChatRequired",
        });
        toast.error(t("msgVRChatNotRunning"));
        return;
      }

      const started = await window.instanceMonitorAPI.startMonitor();
      if (started) {
        toast.success(t("instanceMonitorStarted"));
      } else {
        toast.error(t("instanceMonitorStartFailed"));
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
      await window.instanceMonitorAPI.stopMonitor();
      toast.info(t("instanceMonitorStopped"));
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setIsStoppingMonitor(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground text-sm">{t("loading")}</div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className={cn("flex h-full flex-col gap-4 p-4", className)}>
      {/* Stats Bar */}
      <InstanceStatsBar
        playersJoined={stats.playersJoined}
        playersLeft={stats.playersLeft}
        worldChanges={stats.worldChanges}
        currentWorld={currentWorld}
      />

      {/* Controls */}
      <InstanceControls
        isMonitoring={isMonitoring}
        isStarting={isStartingMonitor}
        isStopping={isStoppingMonitor}
        onStartMonitoring={handleStartMonitoring}
        onStopMonitoring={handleStopMonitoring}
      />

      {/* Logs */}
      <InstanceLogs logs={logs} className="flex-1" />
    </div>
  );
}
