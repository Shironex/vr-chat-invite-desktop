/**
 * System Tray Service
 * Manages the system tray icon, context menu, and window visibility
 */

import { Tray, Menu, nativeImage, app, BrowserWindow } from "electron";
import path from "path";
import { debugLog } from "../debug-mode";
import { APP_NAME } from "../../config/app.config";

class TrayServiceClass {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isMonitoring = false;

  // Callbacks for menu actions (set by vrchat-listeners)
  public onStartMonitoring: (() => Promise<void>) | null = null;
  public onStopMonitoring: (() => Promise<void>) | null = null;

  /**
   * Initialize the system tray
   */
  initialize(mainWindow: BrowserWindow): void {
    if (this.tray) {
      debugLog.warn("Tray already initialized");
      return;
    }

    this.mainWindow = mainWindow;

    // Load icon - use different paths for packaged vs development
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(app.getAppPath(), "src/assets/icon.ico");

    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        debugLog.warn(`Tray icon not found at: ${iconPath}, using default`);
        // Create a simple default icon if file not found
        this.tray = new Tray(nativeImage.createEmpty());
      } else {
        this.tray = new Tray(icon);
      }

      this.tray.setToolTip(APP_NAME);

      // Double-click to show window
      this.tray.on("double-click", () => {
        this.showWindow();
      });

      // Build initial context menu
      this.updateContextMenu();

      debugLog.success("System tray initialized");
    } catch (error) {
      debugLog.error(`Failed to initialize tray: ${error}`);
    }
  }

  /**
   * Show and focus the main window
   */
  showWindow(): void {
    if (!this.mainWindow) return;

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.show();
    this.mainWindow.focus();
    debugLog.info("Window restored from tray");
  }

  /**
   * Hide the main window to tray
   */
  hideWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
      debugLog.info("Window minimized to tray");
    }
  }

  /**
   * Update monitoring state and refresh context menu
   */
  setMonitoringState(isRunning: boolean): void {
    this.isMonitoring = isRunning;
    this.updateContextMenu();
  }

  /**
   * Check if window is currently hidden (minimized to tray)
   */
  isMinimizedToTray(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isVisible();
  }

  /**
   * Update the context menu based on current state
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show Window",
        click: () => this.showWindow(),
      },
      { type: "separator" },
      {
        label: this.isMonitoring ? "Stop Monitoring" : "Start Monitoring",
        click: async () => {
          if (this.isMonitoring) {
            await this.onStopMonitoring?.();
          } else {
            await this.onStartMonitoring?.();
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          debugLog.info("Quit requested from tray menu");
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Clean up the tray
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      debugLog.info("Tray destroyed");
    }
    this.mainWindow = null;
  }

  /**
   * Get the main window reference
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// Export singleton instance
export const TrayService = new TrayServiceClass();
