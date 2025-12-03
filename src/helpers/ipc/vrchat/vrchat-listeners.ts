/**
 * VRChat IPC Listeners
 * Registers main process handlers for VRChat IPC channels
 */

import { BrowserWindow, ipcMain, dialog } from "electron";
import { VRCHAT_CHANNELS } from "./vrchat-channels";
import { debugLog } from "../../debug-mode";
import { VRChatAuthService } from "../../vrchat/vrchat-auth.service";
import { VRChatApiService } from "../../vrchat/vrchat-api.service";
import { LogMonitorService } from "../../vrchat/log-monitor.service";
import { InviteQueueService } from "../../vrchat/invite-queue.service";
import { launchVRChat } from "../../vrchat/vrchat-launcher";
import { SettingsService } from "../../vrchat/settings.service";
import { discordWebhook } from "../../vrchat/discord-webhook.service";
import type {
  VRChatAuthState,
  VRChatLoginCredentials,
  VRChatTwoFactorRequest,
  RateLimitSettings,
  DetectedPlayer,
  InviterLogType,
} from "../../vrchat/vrchat-types";

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

    // Callback for when player is detected
    const onPlayerJoin = (player: DetectedPlayer) => {
      debugLog.info(`Player detected: ${player.displayName} (${player.userId})`);
      // Emit to renderer
      sendToRenderer(VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED, player);
      // Also emit a log entry
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, {
        type: "detect",
        message: `Player joined: ${player.displayName} (${player.userId})`,
        timestamp: player.timestamp,
        userId: player.userId,
        displayName: player.displayName,
      });

      // Add to invite queue automatically
      const added = InviteQueueService.add(player.userId, player.displayName);
      if (!added) {
        debugLog.info(`Player ${player.displayName} already in queue or invited`);
      }
    };

    const started = await LogMonitorService.start(onPlayerJoin);
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());

    if (started) {
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, {
        type: "system",
        message: "Log monitor started - watching for player joins",
        timestamp: Date.now(),
      });
      discordWebhook.sendMonitorStarted();
    }

    return started;
  });

  ipcMain.handle(VRCHAT_CHANNELS.MONITOR_STOP, async (): Promise<void> => {
    debugLog.ipc("MONITOR_STOP called");
    await LogMonitorService.stop();
    sendToRenderer(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, LogMonitorService.getStatus());
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
    },
    onStatsUpdate: (stats) => {
      sendToRenderer(VRCHAT_CHANNELS.INVITE_STATS_UPDATED, stats);
    },
    onQueueUpdate: (queue) => {
      sendToRenderer(VRCHAT_CHANNELS.INVITE_QUEUE_UPDATED, queue);
    },
    onLog: (type, message, userId, displayName) => {
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, {
        type: type as InviterLogType,
        message,
        timestamp: Date.now(),
        userId,
        displayName,
      });
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
  // VRChat Launcher Handler
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle(VRCHAT_CHANNELS.LAUNCH_VRCHAT, async (): Promise<boolean> => {
    debugLog.ipc("LAUNCH_VRCHAT called");
    const launched = await launchVRChat();
    if (launched) {
      sendToRenderer(VRCHAT_CHANNELS.LOG_ENTRY, {
        type: "system",
        message: "VRChat launch initiated",
        timestamp: Date.now(),
      });
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
