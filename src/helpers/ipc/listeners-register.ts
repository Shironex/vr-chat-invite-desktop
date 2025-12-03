import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { registerDebugListeners } from "./debug/debug-listeners";
import { registerUpdaterListeners } from "./updater/updater-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  registerDebugListeners(mainWindow);
  registerUpdaterListeners();
}
