/**
 * VRChat Context Bridge Exposure
 * Exposes VRChat IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from "electron";
import { VRCHAT_CHANNELS } from "./vrchat-channels";
import type {
  VRChatAuthState,
  VRChatLoginCredentials,
  VRChatTwoFactorRequest,
  InviterStats,
  InviteRequest,
  InviteResultData,
  InviterLogEntry,
  MonitorStatus,
  RateLimitSettings,
  DetectedPlayer,
  VRChatGroup,
} from "../../vrchat/vrchat-types";

export function exposeVRChatContext() {
  contextBridge.exposeInMainWorld("vrchatAPI", {
    // ─────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────

    /**
     * Login with username and password
     */
    login: (credentials: VRChatLoginCredentials): Promise<VRChatAuthState> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.AUTH_LOGIN, credentials),

    /**
     * Logout and clear session
     */
    logout: (): Promise<void> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.AUTH_LOGOUT),

    /**
     * Verify 2FA code
     */
    verify2FA: (request: VRChatTwoFactorRequest): Promise<VRChatAuthState> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.AUTH_VERIFY_2FA, request),

    /**
     * Get current authentication state
     */
    getAuthState: (): Promise<VRChatAuthState> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.AUTH_GET_STATE),

    /**
     * Validate current session (check if still valid)
     */
    validateSession: (): Promise<boolean> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.AUTH_VALIDATE_SESSION),

    // ─────────────────────────────────────────────────────────────────
    // Log Monitor
    // ─────────────────────────────────────────────────────────────────

    /**
     * Start monitoring VRChat log files
     */
    startMonitor: (): Promise<boolean> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.MONITOR_START),

    /**
     * Stop monitoring log files
     */
    stopMonitor: (): Promise<void> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.MONITOR_STOP),

    /**
     * Get current monitor status
     */
    getMonitorStatus: (): Promise<MonitorStatus> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.MONITOR_GET_STATUS),

    // ─────────────────────────────────────────────────────────────────
    // Invite System
    // ─────────────────────────────────────────────────────────────────

    /**
     * Manually add a user to the invite queue
     */
    addToQueue: (userId: string, displayName: string): Promise<boolean> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.INVITE_QUEUE_ADD, userId, displayName),

    /**
     * Clear the invite queue
     */
    clearQueue: (): Promise<void> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.INVITE_QUEUE_CLEAR),

    /**
     * Get current inviter statistics
     */
    getStats: (): Promise<InviterStats> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.INVITE_GET_STATS),

    /**
     * Get current invite queue
     */
    getQueue: (): Promise<InviteRequest[]> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.INVITE_GET_QUEUE),

    // ─────────────────────────────────────────────────────────────────
    // VRChat Launcher
    // ─────────────────────────────────────────────────────────────────

    /**
     * Launch VRChat executable
     */
    launchVRChat: (): Promise<boolean> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.LAUNCH_VRCHAT),

    // ─────────────────────────────────────────────────────────────────
    // Settings
    // ─────────────────────────────────────────────────────────────────

    /**
     * Get rate limit settings
     */
    getSettings: (): Promise<RateLimitSettings> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.SETTINGS_GET),

    /**
     * Update rate limit settings
     */
    setSettings: (settings: Partial<RateLimitSettings>): Promise<void> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.SETTINGS_SET, settings),

    /**
     * Reset settings to defaults
     */
    resetSettings: (): Promise<RateLimitSettings> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.SETTINGS_RESET),

    // ─────────────────────────────────────────────────────────────────
    // VRChat Path
    // ─────────────────────────────────────────────────────────────────

    /**
     * Get current VRChat executable path (stored or auto-detected)
     */
    getVRChatPath: (): Promise<string | null> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.PATH_GET),

    /**
     * Set VRChat executable path
     */
    setVRChatPath: (path: string): Promise<boolean> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.PATH_SET, path),

    /**
     * Auto-detect VRChat path
     */
    detectVRChatPath: (): Promise<string | null> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.PATH_DETECT),

    /**
     * Open file browser to select VRChat executable
     */
    browseVRChatPath: (): Promise<string | null> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.PATH_BROWSE),

    // ─────────────────────────────────────────────────────────────────
    // Group Info
    // ─────────────────────────────────────────────────────────────────

    /**
     * Get configured group info
     */
    getGroupInfo: (): Promise<VRChatGroup | null> =>
      ipcRenderer.invoke(VRCHAT_CHANNELS.GROUP_GET_INFO),

    // ─────────────────────────────────────────────────────────────────
    // Event Listeners
    // ─────────────────────────────────────────────────────────────────

    /**
     * Listen for auth state changes
     */
    onAuthStateChanged: (callback: (state: VRChatAuthState) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: VRChatAuthState) =>
        callback(state);
      ipcRenderer.on(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, handler);
      return () => {
        ipcRenderer.removeListener(VRCHAT_CHANNELS.AUTH_STATE_CHANGED, handler);
      };
    },

    /**
     * Listen for 2FA required events
     */
    on2FARequired: (callback: (methods: string[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, methods: string[]) =>
        callback(methods);
      ipcRenderer.on(VRCHAT_CHANNELS.AUTH_2FA_REQUIRED, handler);
      return () => {
        ipcRenderer.removeListener(VRCHAT_CHANNELS.AUTH_2FA_REQUIRED, handler);
      };
    },

    /**
     * Listen for monitor status changes
     */
    onMonitorStatusChanged: (callback: (status: MonitorStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: MonitorStatus) =>
        callback(status);
      ipcRenderer.on(VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED, handler);
      return () => {
        ipcRenderer.removeListener(
          VRCHAT_CHANNELS.MONITOR_STATUS_CHANGED,
          handler
        );
      };
    },

    /**
     * Listen for player detection events
     */
    onPlayerDetected: (callback: (player: DetectedPlayer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, player: DetectedPlayer) =>
        callback(player);
      ipcRenderer.on(VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED, handler);
      return () => {
        ipcRenderer.removeListener(
          VRCHAT_CHANNELS.MONITOR_PLAYER_DETECTED,
          handler
        );
      };
    },

    /**
     * Listen for invite results
     */
    onInviteResult: (callback: (result: InviteResultData) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, result: InviteResultData) =>
        callback(result);
      ipcRenderer.on(VRCHAT_CHANNELS.INVITE_RESULT, handler);
      return () => {
        ipcRenderer.removeListener(VRCHAT_CHANNELS.INVITE_RESULT, handler);
      };
    },

    /**
     * Listen for stats updates
     */
    onStatsUpdated: (callback: (stats: InviterStats) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, stats: InviterStats) =>
        callback(stats);
      ipcRenderer.on(VRCHAT_CHANNELS.INVITE_STATS_UPDATED, handler);
      return () => {
        ipcRenderer.removeListener(
          VRCHAT_CHANNELS.INVITE_STATS_UPDATED,
          handler
        );
      };
    },

    /**
     * Listen for queue updates
     */
    onQueueUpdated: (callback: (queue: InviteRequest[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, queue: InviteRequest[]) =>
        callback(queue);
      ipcRenderer.on(VRCHAT_CHANNELS.INVITE_QUEUE_UPDATED, handler);
      return () => {
        ipcRenderer.removeListener(VRCHAT_CHANNELS.INVITE_QUEUE_UPDATED, handler);
      };
    },

    /**
     * Listen for log entries
     */
    onLogEntry: (callback: (entry: InviterLogEntry) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: InviterLogEntry) =>
        callback(entry);
      ipcRenderer.on(VRCHAT_CHANNELS.LOG_ENTRY, handler);
      return () => {
        ipcRenderer.removeListener(VRCHAT_CHANNELS.LOG_ENTRY, handler);
      };
    },
  });
}
