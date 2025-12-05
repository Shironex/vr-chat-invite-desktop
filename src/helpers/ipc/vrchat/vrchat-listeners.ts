/**
 * VRChat IPC Listeners
 * Registers main process handlers for VRChat IPC channels
 */

import { BrowserWindow, ipcMain, dialog } from "electron";
import * as fs from "fs";
import { VRCHAT_CHANNELS } from "./vrchat-channels";
import { debugLog } from "../../debug-mode";
import { VRChatAuthService } from "../../vrchat/vrchat-auth.service";
import { VRChatApiService } from "../../vrchat/vrchat-api.service";
import { LogMonitorService } from "../../vrchat/log-monitor.service";
import { InviteQueueService } from "../../vrchat/invite-queue.service";
import { InviteHistoryService } from "../../vrchat/invite-history.service";
import { SessionStatsService } from "../../vrchat/session-stats.service";
import { LogBufferService } from "../../vrchat/log-buffer.service";
import { ProcessDetectionService } from "../../vrchat/process-detection.service";
import { launchVRChat } from "../../vrchat/vrchat-launcher";
import { SettingsService } from "../../vrchat/settings.service";
import { discordWebhook } from "../../vrchat/discord-webhook.service";
import { TrayService } from "../../tray/tray.service";
import { TrayNotificationService } from "../../tray/tray-notification.service";
import type {
  VRChatAuthState,
  VRChatLoginCredentials,
  VRChatTwoFactorRequest,
  RateLimitSettings,
  DetectedPlayer,
  InviterLogType,
  InviterLogEntry,
  InviteHistoryQueryOptions,
  InviteHistoryExportResult,
  SessionStatsQueryOptions,
  WebhookSettings,
  InstanceEvent,
  InstanceLogEntry,
  InstanceWebhookSettings,
} from "../../vrchat/vrchat-types";
import { InstanceMonitorService } from "../../vrchat/instance-monitor.service";
import { InstanceWebhookService } from "../../vrchat/instance-webhook.service";
import { InstanceLogBufferService } from "../../vrchat/instance-log-buffer.service";

let mainWindow: BrowserWindow | null = null;

/**
 * Send event to renderer
 */
function sendToRenderer(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

/**
 * Register all VRChat IPC listeners
 */
export function registerVRChatListeners(window: BrowserWindow) {
  mainWindow = window;
  debugLog.ipc("Registering VRChat IPC listeners...");

  // ─────────────────────────────────────────────────────────────────
  // Authentication Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(
    VRCHAT_CHANNELS.AUTH_LOGIN,
    async (_event, credentials: VRChatLoginCredentials): Promise<VRChatAuthState> => {
      debugLog.ipc(`AUTH_LOGIN called for user: ${credentials.username}`);
      try {
        const result = await VRChatAuthService.login(credentials);
        // Emit state change to renderer
        sendToRenderer(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, result);
        // If 2FA required, emit that event too
        if (result.requiresTwoFactor && result.twoFactorMethods) {
          sendToRenderer(VRCHAT_CHANNELS.AUTH_2FA_REQUIRED, result.twoFactorMethods);
        }
        // Send Discord notification on successful login (without 2FA)
        if (result.isAuthenticated && result.displayName) {
          discordWebhook.setOperator(result.displayName);
          discordWebhook.sendAuthSuccess(result.displayName);
        }
        return result;
      } catch (error) {
        debugLog.error(`Login error: ${error}`);
        throw error;
      }
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.AUTH_LOGOUT, async (): Promise<void> => {
    debugLog.ipc("AUTH_LOGOUT called");
    await VRChatAuthService.logout();
    discordWebhook.setOperator(null);
    sendToRenderer(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, {
      isAuthenticated: false,
      requiresTwoFactor: false,
    });
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.AUTH_VERIFY_2FA,
    async (_event, request: VRChatTwoFactorRequest): Promise<VRChatAuthState> => {
      debugLog.ipc(`AUTH_VERIFY_2FA called with method: ${request.method}`);
      try {
        const result = await VRChatAuthService.verify2FA(request);
        sendToRenderer(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, result);
        // Send Discord notification on successful 2FA verification
        if (result.isAuthenticated && result.displayName) {
          discordWebhook.setOperator(result.displayName);
          discordWebhook.sendAuthSuccess(result.displayName);
        }
        return result;
      } catch (error) {
        debugLog.error(`2FA error: ${error}`);
        throw error;
      }
    }
  );

  ipcMain.handle(
    VRCHAT_CHANNELS.AUTH_GET_STATE,
    async (): Promise<VRChatAuthState> => {
      debugLog.ipc("AUTH_GET_STATE called");
      return VRChatAuthService.getAuthState();
    }
  );

  ipcMain.handle(
    VRCHAT_CHANNELS.AUTH_VALIDATE_SESSION,
    async (): Promise<boolean> => {
      debugLog.ipc("AUTH_VALIDATE_SESSION called");
      return VRChatAuthService.validateSession();
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // Log Monitor Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.MONITOR_START, async (): Promise<boolean> => {
    debugLog.ipc("MONITOR_START called");

    // Start a new session for statistics tracking
    SessionStatsService.startSession();

    // Callback for when player is detected
    const onPlayerJoin = (player: DetectedPlayer) => {
      debugLog.info(`Player detected: ${player.displayName} (${player.userId})`);

      // Record in session stats
      SessionStatsService.recordPlayerDetected(player);

      // Emit to renderer
      sendToRenderer(VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED, player);
      // Also emit a log entry with translation key
      const playerLogEntry: InviterLogEntry = {
        type: "detect",
        message: `Player joined: ${player.displayName} (${player.userId})`,
        timestamp: player.timestamp,
        userId: player.userId,
        displayName: player.displayName,
        i18nKey: "logPlayerJoined",
        i18nParams: { name: `${player.displayName} (${player.userId})` },
      };
      LogBufferService.add(playerLogEntry);
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, playerLogEntry);

      // Emit session stats updated event
      sendToRenderer(VRCHAT_CHANNELS.SESSION_STATS_UPDATED, SessionStatsService.getActiveSession());

      // Add to invite queue automatically
      const added = InviteQueueService.add(player.userId, player.displayName);
      if (!added) {
        debugLog.info(`Player ${player.displayName} already in queue or invited`);
      }
    };

    const started = await LogMonitorService.start(onPlayerJoin);
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());

    if (started) {
      const monitorStartLog: InviterLogEntry = {
        type: "system",
        message: "Log monitor started - watching for player joins",
        timestamp: Date.now(),
        i18nKey: "logMonitorStarted",
      };
      LogBufferService.add(monitorStartLog);
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, monitorStartLog);
      discordWebhook.sendMonitorStarted();
      // Update tray state and show notification
      TrayService.setMonitoringState(true);
      TrayNotificationService.showMonitoringStarted();
    }

    return started;
  });

  ipcMain.handle(VRCHAT_CHANNELS.MONITOR_STOP, async (): Promise<void> => {
    debugLog.ipc("MONITOR_STOP called");

    // End the current session for statistics tracking
    SessionStatsService.endSession();

    await LogMonitorService.stop();
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());
    // Update tray state and show notification
    TrayService.setMonitoringState(false);
    TrayNotificationService.showMonitoringStopped();
  });

  ipcMain.handle(VRCHAT_CHANNELS.MONITOR_GET_STATUS, async () => {
    debugLog.ipc("MONITOR_GET_STATUS called");
    return LogMonitorService.getStatus();
  });

  // ─────────────────────────────────────────────────────────────────
  // Invite System Handlers
  // ─────────────────────────────────────────────────────────────────

  // Set up invite queue callbacks
  InviteQueueService.setCallbacks({
    onInviteResult: (result) => {
      sendToRenderer(VRCHAT_CHANNELS.INVITE_RESULT, result);
      // Also save to persistent history
      InviteHistoryService.addEntry(result);
      // Record in session stats
      SessionStatsService.recordInviteResult(result);
      // Emit session stats updated event
      sendToRenderer(VRCHAT_CHANNELS.SESSION_STATS_UPDATED, SessionStatsService.getActiveSession());
      // Desktop notifications
      if (result.result === "success") {
        TrayNotificationService.showInviteSuccess(result.displayName);
      } else if (result.result === "error") {
        TrayNotificationService.showInviteError(result.displayName, result.message);
      }
    },
    onStatsUpdate: (stats) => {
      sendToRenderer(VRCHAT_CHANNELS.INVITE_STATS_UPDATED, stats);
    },
    onQueueUpdate: (queue) => {
      sendToRenderer(VRCHAT_CHANNELS.INVITE_QUEUE_UPDATED, queue);
    },
    onLog: (type, message, userId, displayName, i18nKey, i18nParams) => {
      const logEntry: InviterLogEntry = {
        type: type as InviterLogType,
        message,
        timestamp: Date.now(),
        userId,
        displayName,
        i18nKey,
        i18nParams,
      };
      // Buffer the log entry for persistence
      LogBufferService.add(logEntry);
      // Send to renderer
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, logEntry);
    },
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.INVITE_QUEUE_ADD,
    async (_event, userId: string, displayName: string): Promise<boolean> => {
      debugLog.ipc(`INVITE_QUEUE_ADD called: ${displayName} (${userId})`);
      return InviteQueueService.add(userId, displayName);
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.INVITE_QUEUE_CLEAR, async (): Promise<void> => {
    debugLog.ipc("INVITE_QUEUE_CLEAR called");
    InviteQueueService.clear();
  });

  ipcMain.handle(VRCHAT_CHANNELS.INVITE_GET_STATS, async () => {
    debugLog.ipc("INVITE_GET_STATS called");
    return InviteQueueService.getStats();
  });

  ipcMain.handle(VRCHAT_CHANNELS.INVITE_GET_QUEUE, async () => {
    debugLog.ipc("INVITE_GET_QUEUE called");
    return InviteQueueService.getQueue();
  });

  // ─────────────────────────────────────────────────────────────────
  // Log Buffer Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.LOG_GET_BUFFER, async (): Promise<InviterLogEntry[]> => {
    debugLog.ipc("LOG_GET_BUFFER called");
    return LogBufferService.getLogs();
  });

  ipcMain.handle(VRCHAT_CHANNELS.LOG_CLEAR, async (): Promise<void> => {
    debugLog.ipc("LOG_CLEAR called");
    LogBufferService.clear();
  });

  // ─────────────────────────────────────────────────────────────────
  // VRChat Launcher Handler
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.LAUNCH_VRCHAT, async (): Promise<boolean> => {
    debugLog.ipc("LAUNCH_VRCHAT called");
    const launched = await launchVRChat();
    if (launched) {
      const launchLog: InviterLogEntry = {
        type: "system",
        message: "VRChat launch initiated",
        timestamp: Date.now(),
        i18nKey: "logVRChatLaunched",
      };
      LogBufferService.add(launchLog);
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, launchLog);
    }
    return launched;
  });

  // ─────────────────────────────────────────────────────────────────
  // Settings Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.SETTINGS_GET, async () => {
    debugLog.ipc("SETTINGS_GET called");
    return SettingsService.getSettings();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.SETTINGS_SET,
    async (_event, settings: Partial<RateLimitSettings>): Promise<void> => {
      debugLog.ipc(`SETTINGS_SET called: ${JSON.stringify(settings)}`);
      SettingsService.setSettings(settings);
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.SETTINGS_RESET, async () => {
    debugLog.ipc("SETTINGS_RESET called");
    return SettingsService.resetSettings();
  });

  // ─────────────────────────────────────────────────────────────────
  // VRChat Path Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.PATH_GET, async (): Promise<string | null> => {
    debugLog.ipc("PATH_GET called");
    return SettingsService.getVRChatPath();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.PATH_SET,
    async (_event, path: string): Promise<boolean> => {
      debugLog.ipc(`PATH_SET called: ${path}`);
      return SettingsService.setVRChatPath(path);
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.PATH_DETECT, async (): Promise<string | null> => {
    debugLog.ipc("PATH_DETECT called");
    return SettingsService.detectVRChatPath();
  });

  ipcMain.handle(VRCHAT_CHANNELS.PATH_BROWSE, async (): Promise<string | null> => {
    debugLog.ipc("PATH_BROWSE called");
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Select VRChat Executable",
      filters: [
        { name: "Executable", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
      defaultPath: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\VRChat",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    debugLog.info(`User selected VRChat path: ${selectedPath}`);
    return selectedPath;
  });

  // ─────────────────────────────────────────────────────────────────
  // Group Info Handler
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.GROUP_GET_INFO, async () => {
    debugLog.ipc("GROUP_GET_INFO called");
    return VRChatApiService.getGroupInfo();
  });

  // ─────────────────────────────────────────────────────────────────
  // Process Detection Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.PROCESS_CHECK, async (): Promise<boolean> => {
    debugLog.ipc("PROCESS_CHECK called");
    return ProcessDetectionService.checkVRChatRunning();
  });

  ipcMain.handle(VRCHAT_CHANNELS.PROCESS_GET_STATUS, async (): Promise<boolean> => {
    debugLog.ipc("PROCESS_GET_STATUS called");
    return ProcessDetectionService.getStatus();
  });

  ipcMain.handle(VRCHAT_CHANNELS.PROCESS_START_WATCHING, async (): Promise<void> => {
    debugLog.ipc("PROCESS_START_WATCHING called");
    ProcessDetectionService.startWatching((isRunning) => {
      // Notify renderer when VRChat process status changes
      sendToRenderer(VRCHAT_CHANNELS.PROCESS_STATUS_CHANGED, isRunning);

      // Log the status change
      const logEntry: InviterLogEntry = {
        type: "system",
        message: isRunning ? "VRChat detected as running" : "VRChat is no longer running",
        timestamp: Date.now(),
        i18nKey: isRunning ? "logVRChatRunning" : "logVRChatNotRunning",
      };
      LogBufferService.add(logEntry);
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, logEntry);
    });
  });

  ipcMain.handle(VRCHAT_CHANNELS.PROCESS_STOP_WATCHING, async (): Promise<void> => {
    debugLog.ipc("PROCESS_STOP_WATCHING called");
    ProcessDetectionService.stopWatching();
  });

  // ─────────────────────────────────────────────────────────────────
  // Invite History Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(
    VRCHAT_CHANNELS.HISTORY_GET,
    async (_event, options?: InviteHistoryQueryOptions) => {
      debugLog.ipc(`HISTORY_GET called with options: ${JSON.stringify(options)}`);
      return InviteHistoryService.getHistory(options);
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.HISTORY_GET_STATS, async () => {
    debugLog.ipc("HISTORY_GET_STATS called");
    return InviteHistoryService.getStats();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.HISTORY_EXPORT_CSV,
    async (): Promise<InviteHistoryExportResult> => {
      debugLog.ipc("HISTORY_EXPORT_CSV called");

      try {
        const csvContent = InviteHistoryService.generateCSV();

        const result = await dialog.showSaveDialog(mainWindow!, {
          title: "Export Invite History",
          defaultPath: `invite-history-${new Date().toISOString().split("T")[0]}.csv`,
          filters: [{ name: "CSV Files", extensions: ["csv"] }],
        });

        if (result.canceled || !result.filePath) {
          return { success: false };
        }

        fs.writeFileSync(result.filePath, csvContent, "utf-8");
        debugLog.info(`History exported to: ${result.filePath}`);
        return { success: true, path: result.filePath };
      } catch (error) {
        debugLog.error(`Failed to export history: ${error}`);
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.HISTORY_CLEAR, async (): Promise<void> => {
    debugLog.ipc("HISTORY_CLEAR called");
    InviteHistoryService.clearHistory();
  });

  // ─────────────────────────────────────────────────────────────────
  // Session Statistics Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(
    VRCHAT_CHANNELS.SESSION_STATS_GET,
    async (_event, options?: SessionStatsQueryOptions) => {
      debugLog.ipc(`SESSION_STATS_GET called with options: ${JSON.stringify(options)}`);
      return SessionStatsService.getSessions(options);
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.SESSION_STATS_GET_ACTIVE, async () => {
    debugLog.ipc("SESSION_STATS_GET_ACTIVE called");
    return SessionStatsService.getActiveSession();
  });

  ipcMain.handle(VRCHAT_CHANNELS.SESSION_STATS_CLEAR, async (): Promise<void> => {
    debugLog.ipc("SESSION_STATS_CLEAR called");
    SessionStatsService.clearSessions();
  });

  // ─────────────────────────────────────────────────────────────────
  // Webhook Settings Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.WEBHOOK_SETTINGS_GET, async (): Promise<WebhookSettings> => {
    debugLog.ipc("WEBHOOK_SETTINGS_GET called");
    return SettingsService.getWebhookSettings();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.WEBHOOK_SETTINGS_SET,
    async (_event, settings: Partial<WebhookSettings>): Promise<void> => {
      debugLog.ipc(`WEBHOOK_SETTINGS_SET called: enabled=${settings.enabled}`);
      SettingsService.setWebhookSettings(settings);
      // Update the discord webhook service with new settings
      discordWebhook.updateSettings(SettingsService.getWebhookSettings());
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.WEBHOOK_SETTINGS_RESET, async (): Promise<WebhookSettings> => {
    debugLog.ipc("WEBHOOK_SETTINGS_RESET called");
    const defaults = SettingsService.resetWebhookSettings();
    // Update the discord webhook service with reset settings
    discordWebhook.updateSettings(defaults);
    return defaults;
  });

  // ─────────────────────────────────────────────────────────────────
  // Language Settings Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.LANGUAGE_GET, async (): Promise<"en" | "pl"> => {
    debugLog.ipc("LANGUAGE_GET called");
    return SettingsService.getLanguage();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.LANGUAGE_SET,
    async (_event, lang: "en" | "pl"): Promise<void> => {
      debugLog.ipc(`LANGUAGE_SET called: ${lang}`);
      SettingsService.setLanguage(lang);
    }
  );

  // Initialize services (cleanup old entries)
  InviteHistoryService.initialize();
  SessionStatsService.initialize();

  // Initialize discord webhook with saved settings
  discordWebhook.updateSettings(SettingsService.getWebhookSettings());

  // Set operator from existing session if logged in
  const authState = VRChatAuthService.getAuthState();
  if (authState.isAuthenticated && authState.displayName) {
    discordWebhook.setOperator(authState.displayName);
  }

  // Set up tray service callbacks for context menu actions
  TrayService.onStartMonitoring = async () => {
    debugLog.info("Tray: Start monitoring requested");

    // Start a new session for statistics tracking
    SessionStatsService.startSession();

    const onPlayerJoin = (player: DetectedPlayer) => {
      // Record in session stats
      SessionStatsService.recordPlayerDetected(player);

      sendToRenderer(VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED, player);
      const playerLogEntry: InviterLogEntry = {
        type: "detect",
        message: `Player joined: ${player.displayName} (${player.userId})`,
        timestamp: player.timestamp,
        userId: player.userId,
        displayName: player.displayName,
        i18nKey: "logPlayerJoined",
        i18nParams: { name: `${player.displayName} (${player.userId})` },
      };
      LogBufferService.add(playerLogEntry);
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, playerLogEntry);

      // Emit session stats updated event
      sendToRenderer(VRCHAT_CHANNELS.SESSION_STATS_UPDATED, SessionStatsService.getActiveSession());

      InviteQueueService.add(player.userId, player.displayName);
    };

    const started = await LogMonitorService.start(onPlayerJoin);
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());
    if (started) {
      TrayService.setMonitoringState(true);
      TrayNotificationService.showMonitoringStarted();
      discordWebhook.sendMonitorStarted();
    }
  };

  TrayService.onStopMonitoring = async () => {
    debugLog.info("Tray: Stop monitoring requested");

    // End the current session for statistics tracking
    SessionStatsService.endSession();

    await LogMonitorService.stop();
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());
    TrayService.setMonitoringState(false);
    TrayNotificationService.showMonitoringStopped();
  };

  // ─────────────────────────────────────────────────────────────────
  // Instance Monitor Handlers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Helper to create log entry from instance event
   */
  function createInstanceLogEntry(event: InstanceEvent): InstanceLogEntry {
    switch (event.type) {
      case "world_enter":
        return {
          type: "world",
          message: `Entered world: ${event.worldName || "Unknown"}`,
          timestamp: event.timestamp,
          worldName: event.worldName,
          i18nKey: "instanceWorldEntered",
          i18nParams: { world: event.worldName || "Unknown" },
        };
      case "player_join":
        return {
          type: "join",
          message: `${event.displayName} joined`,
          timestamp: event.timestamp,
          userId: event.userId,
          displayName: event.displayName,
          worldName: event.worldName,
          i18nKey: "instancePlayerJoined",
          i18nParams: { name: event.displayName || "Unknown" },
        };
      case "player_leave":
        return {
          type: "leave",
          message: `${event.displayName} left`,
          timestamp: event.timestamp,
          userId: event.userId,
          displayName: event.displayName,
          worldName: event.worldName,
          i18nKey: "instancePlayerLeft",
          i18nParams: { name: event.displayName || "Unknown" },
        };
      default:
        return {
          type: "system",
          message: "Unknown event",
          timestamp: event.timestamp,
        };
    }
  }

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_MONITOR_START, async (): Promise<boolean> => {
    debugLog.ipc("INSTANCE_MONITOR_START called");

    // Callback for when instance event occurs
    const onInstanceEvent = (event: InstanceEvent) => {
      debugLog.info(`[Instance] Event: ${event.type} - ${event.displayName || event.worldName}`);

      // Send event to renderer
      sendToRenderer(VRCHAT_CHANNELS.INSTANCE_EVENT, event);

      // Create log entry
      const logEntry = createInstanceLogEntry(event);
      InstanceLogBufferService.add(logEntry);
      sendToRenderer(VRCHAT_CHANNELS.INSTANCE_LOG_ENTRY, logEntry);

      // Send Discord webhook
      InstanceWebhookService.sendEvent(event);

      // Update stats
      sendToRenderer(VRCHAT_CHANNELS.INSTANCE_STATS_UPDATED, InstanceMonitorService.getStats());
    };

    const started = await InstanceMonitorService.start(onInstanceEvent);
    sendToRenderer(VRCHAT_CHANNELS.INSTANCE_MONITOR_STATUS_CHANGED, InstanceMonitorService.getStatus());

    if (started) {
      const startLog: InstanceLogEntry = {
        type: "system",
        message: "Instance monitor started",
        timestamp: Date.now(),
        i18nKey: "instanceMonitorStarted",
      };
      InstanceLogBufferService.add(startLog);
      sendToRenderer(VRCHAT_CHANNELS.INSTANCE_LOG_ENTRY, startLog);
    }

    return started;
  });

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_MONITOR_STOP, async (): Promise<void> => {
    debugLog.ipc("INSTANCE_MONITOR_STOP called");

    await InstanceMonitorService.stop();
    sendToRenderer(VRCHAT_CHANNELS.INSTANCE_MONITOR_STATUS_CHANGED, InstanceMonitorService.getStatus());

    const stopLog: InstanceLogEntry = {
      type: "system",
      message: "Instance monitor stopped",
      timestamp: Date.now(),
      i18nKey: "instanceMonitorStopped",
    };
    InstanceLogBufferService.add(stopLog);
    sendToRenderer(VRCHAT_CHANNELS.INSTANCE_LOG_ENTRY, stopLog);
  });

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_MONITOR_GET_STATUS, async () => {
    debugLog.ipc("INSTANCE_MONITOR_GET_STATUS called");
    return InstanceMonitorService.getStatus();
  });

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_MONITOR_GET_STATS, async () => {
    debugLog.ipc("INSTANCE_MONITOR_GET_STATS called");
    return InstanceMonitorService.getStats();
  });

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_MONITOR_RESET_STATS, async (): Promise<void> => {
    debugLog.ipc("INSTANCE_MONITOR_RESET_STATS called");
    InstanceMonitorService.resetStats();
    sendToRenderer(VRCHAT_CHANNELS.INSTANCE_STATS_UPDATED, InstanceMonitorService.getStats());
  });

  // ─────────────────────────────────────────────────────────────────
  // Instance Log Buffer Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_LOG_GET_BUFFER, async (): Promise<InstanceLogEntry[]> => {
    debugLog.ipc("INSTANCE_LOG_GET_BUFFER called");
    return InstanceLogBufferService.getLogs();
  });

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_LOG_CLEAR, async (): Promise<void> => {
    debugLog.ipc("INSTANCE_LOG_CLEAR called");
    InstanceLogBufferService.clear();
  });

  // ─────────────────────────────────────────────────────────────────
  // Instance Webhook Settings Handlers
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_WEBHOOK_GET, async (): Promise<InstanceWebhookSettings> => {
    debugLog.ipc("INSTANCE_WEBHOOK_GET called");
    return SettingsService.getInstanceWebhookSettings();
  });

  ipcMain.handle(
    VRCHAT_CHANNELS.INSTANCE_WEBHOOK_SET,
    async (_event, settings: Partial<InstanceWebhookSettings>): Promise<void> => {
      debugLog.ipc(`INSTANCE_WEBHOOK_SET called: enabled=${settings.enabled}`);
      SettingsService.setInstanceWebhookSettings(settings);
      // Update the instance webhook service with new settings
      InstanceWebhookService.updateSettings(SettingsService.getInstanceWebhookSettings());
    }
  );

  ipcMain.handle(VRCHAT_CHANNELS.INSTANCE_WEBHOOK_RESET, async (): Promise<InstanceWebhookSettings> => {
    debugLog.ipc("INSTANCE_WEBHOOK_RESET called");
    const defaults = SettingsService.resetInstanceWebhookSettings();
    // Update the instance webhook service with reset settings
    InstanceWebhookService.updateSettings(defaults);
    return defaults;
  });

  // ─────────────────────────────────────────────────────────────────
  // Instance Local User Handler
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(
    VRCHAT_CHANNELS.INSTANCE_SET_LOCAL_USER,
    async (_event, displayName: string | null): Promise<void> => {
      debugLog.ipc(`INSTANCE_SET_LOCAL_USER called: ${displayName}`);
      InstanceMonitorService.setLocalUserDisplayName(displayName);
    }
  );

  // Initialize instance webhook service with saved settings
  InstanceWebhookService.updateSettings(SettingsService.getInstanceWebhookSettings());

  debugLog.success("VRChat IPC listeners registered");
}

/**
 * Helper to emit events to renderer
 * These will be called by services in later phases
 */
export const vrchatEvents = {
  emitAuthStateChanged: (state: VRChatAuthState) => {
    sendToRenderer(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, state);
  },

  emit2FARequired: (methods: string[]) => {
    sendToRenderer(VRCHAT_CHANNELS.AUTH_2FA_REQUIRED, methods);
  },

  emitMonitorStatusChanged: (status: { isRunning: boolean; logFilePath?: string }) => {
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, status);
  },

  emitPlayerDetected: (player: { userId: string; displayName: string; timestamp: number }) => {
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED, player);
  },

  emitInviteResult: (result: {
    result: "success" | "skipped" | "error";
    userId: string;
    displayName: string;
    message: string;
    timestamp: number;
  }) => {
    sendToRenderer(VRCHAT_CHANNELS.INVITE_RESULT, result);
  },

  emitStatsUpdated: (stats: {
    totalProcessed: number;
    successful: number;
    skipped: number;
    errors: number;
    queueSize: number;
  }) => {
    sendToRenderer(VRCHAT_CHANNELS.INVITE_STATS_UPDATED, stats);
  },

  emitQueueUpdated: (queue: { userId: string; displayName: string; timestamp: number }[]) => {
    sendToRenderer(VRCHAT_CHANNELS.INVITE_QUEUE_UPDATED, queue);
  },

  emitLogEntry: (entry: {
    type: "detect" | "invite" | "skip" | "error" | "auth" | "rate" | "queue" | "system";
    message: string;
    timestamp: number;
    userId?: string;
    displayName?: string;
  }) => {
    sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, entry);
  },
};
