import { BrowserWindow, ipcMain, app } from "electron";
import {
  WIN_CLOSE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_MINIMIZE_CHANNEL,
} from "./window-channels";
import { debugLog } from "../../debug-mode";
import { SettingsService } from "../../vrchat/settings.service";
import { TrayNotificationService } from "../../tray/tray-notification.service";

// Track if we've shown the "minimized to tray" notification
let hasShownTrayHint = false;

export function addWindowEventListeners(mainWindow: BrowserWindow) {
  ipcMain.handle(WIN_MINIMIZE_CHANNEL, () => {
    debugLog.ipc("IPC: WIN_MINIMIZE called - Minimizing window");
    mainWindow.minimize();
  });
  ipcMain.handle(WIN_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      debugLog.ipc("IPC: WIN_MAXIMIZE called - Unmaximizing window");
      mainWindow.unmaximize();
    } else {
      debugLog.ipc("IPC: WIN_MAXIMIZE called - Maximizing window");
      mainWindow.maximize();
    }
  });
  ipcMain.handle(WIN_CLOSE_CHANNEL, () => {
    const settings = SettingsService.getTraySettings();

    if (settings.minimizeToTray) {
      debugLog.ipc("IPC: WIN_CLOSE called - Minimizing to tray");
      mainWindow.hide();

      // Show a one-time hint about minimizing to tray
      if (!hasShownTrayHint) {
        hasShownTrayHint = true;
        TrayNotificationService.showMinimizedToTray();
      }
    } else {
      debugLog.ipc("IPC: WIN_CLOSE called - Quitting application");
      app.quit();
    }
  });
}
