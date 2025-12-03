import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log";
import { DEBUG_CHANNELS } from "./debug-channels";
import { sendToDebugConsole, isDebugEnabled } from "../../debug-mode";

type DebugLogLevel =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "debug"
  | "route"
  | "ipc"
  | "updater"
  | "perf"
  | "network"
  | "state"
  | "lifecycle";

// Emoji prefixes for each level (matching debug-mode.ts)
const LEVEL_PREFIXES: Record<DebugLogLevel, string> = {
  info: "ℹ️ ",
  success: "✅",
  warn: "⚠️ ",
  error: "❌",
  debug: "🔍",
  route: "🧭 [ROUTE]",
  ipc: "📡 [IPC]",
  updater: "🔄 [UPDATER]",
  perf: "⚡ [PERF]",
  network: "🌐 [NETWORK]",
  state: "📊 [STATE]",
  lifecycle: "🔃 [LIFECYCLE]",
};

/**
 * Register debug IPC listeners
 */
export function registerDebugListeners(_mainWindow: BrowserWindow): void {
  // Handle renderer debug logs
  ipcMain.on(
    DEBUG_CHANNELS.LOG,
    (
      event,
      data: {
        level: DebugLogLevel;
        message: string;
        args: unknown[];
      }
    ) => {
      if (!isDebugEnabled()) return;

      const { level, message, args } = data;
      // Get window ID from the sender
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id;

      const prefix = LEVEL_PREFIXES[level];
      const formattedMessage = `${prefix} [RENDERER] ${message}`;

      // Log to electron-log
      switch (level) {
        case "error":
          log.error(formattedMessage, ...args);
          break;
        case "warn":
          log.warn(formattedMessage, ...args);
          break;
        case "debug":
        case "ipc":
        case "perf":
        case "network":
        case "state":
          log.debug(formattedMessage, ...args);
          break;
        default:
          log.info(formattedMessage, ...args);
          break;
      }

      // Send to debug console with window info
      sendToDebugConsole(level, message, args, windowId);
    }
  );
}
