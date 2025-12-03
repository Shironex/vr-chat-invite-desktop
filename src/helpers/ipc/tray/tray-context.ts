/**
 * Expose tray API to renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from "electron";
import { TRAY_CHANNELS } from "./tray-channels";
import type { TraySettings } from "../../vrchat/vrchat-types";

export function exposeTrayContext() {
  contextBridge.exposeInMainWorld("trayAPI", {
    // Get tray settings
    getSettings: (): Promise<TraySettings> =>
      ipcRenderer.invoke(TRAY_CHANNELS.SETTINGS_GET),

    // Update tray settings
    setSettings: (settings: Partial<TraySettings>): Promise<TraySettings> =>
      ipcRenderer.invoke(TRAY_CHANNELS.SETTINGS_SET, settings),
  });
}
