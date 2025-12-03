/**
 * Tray Notification Service
 * Handles native desktop notifications
 */

import { Notification, app } from "electron";
import path from "path";
import { debugLog } from "../debug-mode";
import { SettingsService } from "../vrchat/settings.service";
import { APP_NAME } from "../../config/app.config";

class TrayNotificationServiceClass {
  /**
   * Get the icon path for notifications
   */
  private getIconPath(): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(__dirname, "../../assets/icon.ico");
  }

  /**
   * Check if notifications are enabled
   */
  private isEnabled(): boolean {
    const settings = SettingsService.getTraySettings();
    return settings.showDesktopNotifications;
  }

  /**
   * Show a notification if enabled
   */
  private showNotification(title: string, body: string): void {
    if (!this.isEnabled()) return;

    try {
      const notification = new Notification({
        title,
        body,
        icon: this.getIconPath(),
        silent: false,
      });

      notification.show();
      debugLog.info(`Notification shown: ${title}`);
    } catch (error) {
      debugLog.error(`Failed to show notification: ${error}`);
    }
  }

  /**
   * Show notification for successful invite
   */
  showInviteSuccess(displayName: string): void {
    this.showNotification(APP_NAME, `Invite sent to ${displayName}`);
  }

  /**
   * Show notification for invite error
   */
  showInviteError(displayName: string, error: string): void {
    this.showNotification(APP_NAME, `Failed to invite ${displayName}: ${error}`);
  }

  /**
   * Show notification when monitoring starts
   */
  showMonitoringStarted(): void {
    this.showNotification(APP_NAME, "Monitoring started - watching for players");
  }

  /**
   * Show notification when monitoring stops
   */
  showMonitoringStopped(): void {
    this.showNotification(APP_NAME, "Monitoring stopped");
  }

  /**
   * Show notification when app is minimized to tray (first time hint)
   */
  showMinimizedToTray(): void {
    this.showNotification(
      APP_NAME,
      "App minimized to tray. Double-click tray icon to restore."
    );
  }
}

// Export singleton instance
export const TrayNotificationService = new TrayNotificationServiceClass();
