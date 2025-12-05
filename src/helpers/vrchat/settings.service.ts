/**
 * Settings Service
 * Manages user-configurable rate limit settings and VRChat paths
 */

import Store from "electron-store";
import * as fs from "fs";
import * as path from "path";
import { debugLog } from "../debug-mode";
import { DEFAULT_RATE_LIMITS } from "../../config/vrchat.config";
import { TRAY_CONFIG } from "../../config/app.config";
import type { RateLimitSettings, TraySettings, WebhookSettings, InstanceWebhookSettings } from "./vrchat-types";

const SETTINGS_KEY = "rate-limit-settings";
const VRCHAT_PATH_KEY = "vrchat-path";
const TRAY_SETTINGS_KEY = "tray-settings";
const WEBHOOK_SETTINGS_KEY = "webhook-settings";
const INSTANCE_WEBHOOK_SETTINGS_KEY = "instance-webhook-settings";
const LANGUAGE_KEY = "app-language";

/**
 * Default webhook settings - disabled by default
 */
export const DEFAULT_WEBHOOK_SETTINGS: WebhookSettings = {
  enabled: false,
  successUrl: "",
  warningUrl: "",
  errorUrl: "",
};

/**
 * Default instance webhook settings - disabled by default
 */
export const DEFAULT_INSTANCE_WEBHOOK_SETTINGS: InstanceWebhookSettings = {
  enabled: false,
  webhookUrl: "",
};

// Settings store
const store = new Store({
  name: "vrchat-settings",
});

/**
 * Common VRChat install paths to check
 */
const COMMON_VRCHAT_PATHS = [
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\VRChat\\launch.exe",
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\VRChat\\VRChat.exe",
  "D:\\Steam\\steamapps\\common\\VRChat\\launch.exe",
  "D:\\SteamLibrary\\steamapps\\common\\VRChat\\launch.exe",
  "E:\\Steam\\steamapps\\common\\VRChat\\launch.exe",
  "E:\\SteamLibrary\\steamapps\\common\\VRChat\\launch.exe",
  "F:\\Steam\\steamapps\\common\\VRChat\\launch.exe",
  "F:\\SteamLibrary\\steamapps\\common\\VRChat\\launch.exe",
];

/**
 * Settings Service Singleton
 */
class SettingsServiceClass {
  /**
   * Get current settings
   */
  getSettings(): RateLimitSettings {
    const saved = store.get(SETTINGS_KEY) as Partial<RateLimitSettings> | undefined;

    // Merge with defaults to ensure all fields exist
    const settings: RateLimitSettings = {
      inviteBatchCount: saved?.inviteBatchCount ?? DEFAULT_RATE_LIMITS.inviteBatchCount,
      inviteBatchDelay: saved?.inviteBatchDelay ?? DEFAULT_RATE_LIMITS.inviteBatchDelay,
      inviteDelayBetween: saved?.inviteDelayBetween ?? DEFAULT_RATE_LIMITS.inviteDelayBetween,
      queueThreshold: saved?.queueThreshold ?? DEFAULT_RATE_LIMITS.queueThreshold,
      queuePauseDelay: saved?.queuePauseDelay ?? DEFAULT_RATE_LIMITS.queuePauseDelay,
    };

    return settings;
  }

  /**
   * Update settings
   */
  setSettings(partial: Partial<RateLimitSettings>): void {
    const current = this.getSettings();
    const updated: RateLimitSettings = {
      ...current,
      ...partial,
    };

    // Validate values
    updated.inviteBatchCount = Math.max(1, Math.min(50, updated.inviteBatchCount));
    updated.inviteBatchDelay = Math.max(1, Math.min(300, updated.inviteBatchDelay));
    updated.inviteDelayBetween = Math.max(0.5, Math.min(60, updated.inviteDelayBetween));
    updated.queueThreshold = Math.max(10, Math.min(500, updated.queueThreshold));
    updated.queuePauseDelay = Math.max(60, Math.min(3600, updated.queuePauseDelay));

    store.set(SETTINGS_KEY, updated);
    debugLog.info(`Settings updated: ${JSON.stringify(updated)}`);
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): RateLimitSettings {
    store.delete(SETTINGS_KEY);
    debugLog.info("Settings reset to defaults");
    return { ...DEFAULT_RATE_LIMITS };
  }

  /**
   * Auto-detect VRChat executable path
   */
  detectVRChatPath(): string | null {
    for (const exePath of COMMON_VRCHAT_PATHS) {
      const normalizedPath = path.normalize(exePath);
      if (fs.existsSync(normalizedPath)) {
        debugLog.info(`Auto-detected VRChat at: ${normalizedPath}`);
        return normalizedPath;
      }
    }
    debugLog.warn("VRChat path not auto-detected");
    return null;
  }

  /**
   * Get stored VRChat path, or auto-detect if not set
   */
  getVRChatPath(): string | null {
    const storedPath = store.get(VRCHAT_PATH_KEY) as string | undefined;

    if (storedPath) {
      // Verify stored path still exists
      if (fs.existsSync(storedPath)) {
        return storedPath;
      }
      debugLog.warn(`Stored VRChat path no longer exists: ${storedPath}`);
    }

    // Try auto-detection
    return this.detectVRChatPath();
  }

  /**
   * Set VRChat executable path
   */
  setVRChatPath(exePath: string): boolean {
    const normalizedPath = path.normalize(exePath);

    // Verify path exists
    if (!fs.existsSync(normalizedPath)) {
      debugLog.error(`VRChat path does not exist: ${normalizedPath}`);
      return false;
    }

    store.set(VRCHAT_PATH_KEY, normalizedPath);
    debugLog.info(`VRChat path set: ${normalizedPath}`);
    return true;
  }

  /**
   * Clear stored VRChat path (will use auto-detect next time)
   */
  clearVRChatPath(): void {
    store.delete(VRCHAT_PATH_KEY);
    debugLog.info("VRChat path cleared, will auto-detect");
  }

  // ─────────────────────────────────────────────────────────────────
  // Tray Settings
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current tray settings
   */
  getTraySettings(): TraySettings {
    const saved = store.get(TRAY_SETTINGS_KEY) as Partial<TraySettings> | undefined;

    // Merge with defaults to ensure all fields exist
    const settings: TraySettings = {
      minimizeToTray: saved?.minimizeToTray ?? TRAY_CONFIG.defaults.minimizeToTray,
      showDesktopNotifications:
        saved?.showDesktopNotifications ?? TRAY_CONFIG.defaults.showDesktopNotifications,
    };

    return settings;
  }

  /**
   * Update tray settings
   */
  setTraySettings(partial: Partial<TraySettings>): void {
    const current = this.getTraySettings();
    const updated: TraySettings = {
      ...current,
      ...partial,
    };

    store.set(TRAY_SETTINGS_KEY, updated);
    debugLog.info(`Tray settings updated: ${JSON.stringify(updated)}`);
  }

  /**
   * Reset tray settings to defaults
   */
  resetTraySettings(): TraySettings {
    store.delete(TRAY_SETTINGS_KEY);
    debugLog.info("Tray settings reset to defaults");
    return { ...TRAY_CONFIG.defaults };
  }

  // ─────────────────────────────────────────────────────────────────
  // Webhook Settings
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current webhook settings
   */
  getWebhookSettings(): WebhookSettings {
    const saved = store.get(WEBHOOK_SETTINGS_KEY) as Partial<WebhookSettings> | undefined;

    // Merge with defaults to ensure all fields exist
    const settings: WebhookSettings = {
      enabled: saved?.enabled ?? DEFAULT_WEBHOOK_SETTINGS.enabled,
      successUrl: saved?.successUrl ?? DEFAULT_WEBHOOK_SETTINGS.successUrl,
      warningUrl: saved?.warningUrl ?? DEFAULT_WEBHOOK_SETTINGS.warningUrl,
      errorUrl: saved?.errorUrl ?? DEFAULT_WEBHOOK_SETTINGS.errorUrl,
    };

    return settings;
  }

  /**
   * Update webhook settings
   */
  setWebhookSettings(partial: Partial<WebhookSettings>): void {
    const current = this.getWebhookSettings();
    const updated: WebhookSettings = {
      ...current,
      ...partial,
    };

    // Validate webhook URLs (basic format check)
    const isValidUrl = (url: string) =>
      !url || url.startsWith("https://discord.com/api/webhooks/");

    if (!isValidUrl(updated.successUrl)) {
      debugLog.warn("Invalid success webhook URL, clearing");
      updated.successUrl = "";
    }
    if (!isValidUrl(updated.warningUrl)) {
      debugLog.warn("Invalid warning webhook URL, clearing");
      updated.warningUrl = "";
    }
    if (!isValidUrl(updated.errorUrl)) {
      debugLog.warn("Invalid error webhook URL, clearing");
      updated.errorUrl = "";
    }

    store.set(WEBHOOK_SETTINGS_KEY, updated);
    debugLog.info(`Webhook settings updated: enabled=${updated.enabled}`);
  }

  /**
   * Reset webhook settings to defaults (disabled)
   */
  resetWebhookSettings(): WebhookSettings {
    store.delete(WEBHOOK_SETTINGS_KEY);
    debugLog.info("Webhook settings reset to defaults");
    return { ...DEFAULT_WEBHOOK_SETTINGS };
  }

  // ─────────────────────────────────────────────────────────────────
  // Language Settings
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current language (defaults to 'en')
   */
  getLanguage(): "en" | "pl" {
    const saved = store.get(LANGUAGE_KEY) as string | undefined;
    return saved === "pl" ? "pl" : "en";
  }

  /**
   * Set app language
   */
  setLanguage(lang: "en" | "pl"): void {
    store.set(LANGUAGE_KEY, lang);
    debugLog.info(`Language set to: ${lang}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Instance Webhook Settings
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current instance webhook settings
   */
  getInstanceWebhookSettings(): InstanceWebhookSettings {
    const saved = store.get(INSTANCE_WEBHOOK_SETTINGS_KEY) as Partial<InstanceWebhookSettings> | undefined;

    // Merge with defaults to ensure all fields exist
    const settings: InstanceWebhookSettings = {
      enabled: saved?.enabled ?? DEFAULT_INSTANCE_WEBHOOK_SETTINGS.enabled,
      webhookUrl: saved?.webhookUrl ?? DEFAULT_INSTANCE_WEBHOOK_SETTINGS.webhookUrl,
    };

    return settings;
  }

  /**
   * Update instance webhook settings
   */
  setInstanceWebhookSettings(partial: Partial<InstanceWebhookSettings>): void {
    const current = this.getInstanceWebhookSettings();
    const updated: InstanceWebhookSettings = {
      ...current,
      ...partial,
    };

    // Validate webhook URL (basic format check)
    if (updated.webhookUrl && !updated.webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      debugLog.warn("Invalid instance webhook URL, clearing");
      updated.webhookUrl = "";
    }

    store.set(INSTANCE_WEBHOOK_SETTINGS_KEY, updated);
    debugLog.info(`Instance webhook settings updated: enabled=${updated.enabled}`);
  }

  /**
   * Reset instance webhook settings to defaults (disabled)
   */
  resetInstanceWebhookSettings(): InstanceWebhookSettings {
    store.delete(INSTANCE_WEBHOOK_SETTINGS_KEY);
    debugLog.info("Instance webhook settings reset to defaults");
    return { ...DEFAULT_INSTANCE_WEBHOOK_SETTINGS };
  }
}

// Export singleton instance
export const SettingsService = new SettingsServiceClass();
