/**
 * IPC Listeners for tray operations
 */

import { ipcMain } from "electron";
import { TRAY_CHANNELS } from "./tray-channels";
import { SettingsService } from "../../vrchat/settings.service";
import { debugLog } from "../../debug-mode";
import type { TraySettings } from "../../vrchat/vrchat-types";

export function registerTrayListeners() {
  // Get tray settings
  ipcMain.handle(TRAY_CHANNELS.SETTINGS_GET, () => {
    debugLog.ipc("IPC: TRAY_SETTINGS_GET called");
    return SettingsService.getTraySettings();
  });

  // Set tray settings
  ipcMain.handle(
    TRAY_CHANNELS.SETTINGS_SET,
    (_event, settings: Partial<TraySettings>) => {
      debugLog.ipc(`IPC: TRAY_SETTINGS_SET called with: ${JSON.stringify(settings)}`);
      SettingsService.setTraySettings(settings);
      return SettingsService.getTraySettings();
    }
  );
}
