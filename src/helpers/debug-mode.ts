import log from "electron-log";
import { app, BrowserWindow } from "electron";
import path from "path";
import { DEBUG_CONSOLE } from "../config/app.config";
import { windowRegistry } from "./window-registry";
import { DebugReportService } from "./vrchat/debug-report.service";

let isDebugMode = false;
let debugConsoleWindow: BrowserWindow | null = null;

/**
 * Initialize debug mode based on environment variable or command-line arguments
 * Call this early in main process startup
 */
export function initializeDebugMode(): boolean {
  // Check for DEBUG environment variable or --debug flag
  const hasDebugFlag = process.env.DEBUG === "1" || process.argv.includes("--debug");

  if (hasDebugFlag) {
    isDebugMode = true;

    // Configure electron-log for debug mode
    log.transports.console.level = "debug";
    log.transports.file.level = "debug";

    // Enable colors in console
    log.transports.console.useStyles = true;

    // Custom format with colors
    log.transports.console.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

    // Log to both file and console
    log.transports.file.resolvePathFn = () => {
      return `${app.getPath("userData")}/logs/debug.log`;
    };

    log.info("═══════════════════════════════════════════════");
    log.info("🐛 DEBUG MODE ENABLED");
    log.info("═══════════════════════════════════════════════");
    log.info(`App version: ${app.getVersion()}`);
    log.info(`Electron version: ${process.versions.electron}`);
    log.info(`Node version: ${process.versions.node}`);
    log.info(`Platform: ${process.platform}`);
    log.info(`Arguments: ${process.argv.join(" ")}`);
    log.info("═══════════════════════════════════════════════");
  } else {
    // Production mode - minimal console logging
    log.transports.console.level = "warn";
    log.transports.file.level = "info";
  }

  return isDebugMode;
}

/**
 * Create debug console window
 * Should be called after app is ready
 */
export function createDebugConsole(): void {
  if (!isDebugMode || debugConsoleWindow) return;

  const preloadPath = path.join(__dirname, "debug-console-preload.js");
  debugLog.info(`Debug console preload path: ${preloadPath}`);

  debugConsoleWindow = new BrowserWindow({
    width: DEBUG_CONSOLE.width,
    height: DEBUG_CONSOLE.height,
    title: DEBUG_CONSOLE.title,
    backgroundColor: DEBUG_CONSOLE.backgroundColor,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    autoHideMenuBar: true,
    show: false, // Don't show until loaded
  });

  const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    // In development, __dirname is dist-electron, so go up ONE level to project root, then into src
    const consolePath = path.join(__dirname, "../src/debug-console.html");
    debugLog.info(`Loading debug console from: ${consolePath}`);
    debugConsoleWindow.loadFile(consolePath);
  } else {
    // In production, load from dist-electron directory
    const consolePath = path.join(__dirname, "debug-console.html");
    debugConsoleWindow.loadFile(consolePath);
  }

  debugConsoleWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    debugLog.error(`Debug console failed to load: ${errorDescription} (${errorCode})`);
    debugLog.error(`Attempted URL: ${validatedURL}`);
  });

  debugConsoleWindow.once("ready-to-show", () => {
    debugConsoleWindow?.show();
    debugLog.success("Debug console window opened");
  });

  debugConsoleWindow.on("closed", () => {
    debugConsoleWindow = null;
  });
}

/**
 * Send log to debug console window
 */
export function sendToDebugConsole(
  level: string,
  message: string,
  args: unknown[] = [],
  windowId?: number
): void {
  if (debugConsoleWindow && !debugConsoleWindow.isDestroyed()) {
    const windowInfo = windowId
      ? {
          id: windowId,
          name: windowRegistry.getName(windowId),
          color: windowRegistry.getColor(windowId),
        }
      : { id: 0, name: "Main", color: "#58a6ff" };

    debugConsoleWindow.webContents.send("debug:log", {
      level,
      message,
      args,
      window: windowInfo,
    });
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return isDebugMode;
}

/**
 * Debug logger with colored output (for main process)
 * Logs are also captured in DebugReportService for debug reports
 */
export const debugLog = {
  info: (message: string, ...args: unknown[]) => {
    // Always capture info logs for debug reports
    DebugReportService.addLog("info", message);

    if (isDebugMode) {
      log.info(`ℹ️  ${message}`, ...args);
      sendToDebugConsole("info", message, args);
    }
  },

  success: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.info(`✅ ${message}`, ...args);
      sendToDebugConsole("success", message, args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    // Always capture warnings for debug reports
    DebugReportService.addLog("warn", message);

    if (isDebugMode) {
      log.warn(`⚠️  ${message}`, ...args);
      sendToDebugConsole("warn", message, args);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    // Always capture errors for debug reports (even in production)
    DebugReportService.addLog("error", message);

    if (isDebugMode) {
      log.error(`❌ ${message}`, ...args);
      sendToDebugConsole("error", message, args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    // Capture debug logs for reports
    DebugReportService.addLog("debug", message);

    if (isDebugMode) {
      log.debug(`🔍 ${message}`, ...args);
      sendToDebugConsole("debug", message, args);
    }
  },

  route: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.info(`🧭 [ROUTE] ${message}`, ...args);
      sendToDebugConsole("route", message, args);
    }
  },

  ipc: (message: string, ...args: unknown[]) => {
    // Capture IPC logs for reports
    DebugReportService.addLog("ipc", message, "IPC");

    if (isDebugMode) {
      log.debug(`📡 [IPC] ${message}`, ...args);
      sendToDebugConsole("ipc", message, args);
    }
  },

  updater: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.info(`🔄 [UPDATER] ${message}`, ...args);
      sendToDebugConsole("updater", message, args);
    }
  },

  perf: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.debug(`⚡ [PERF] ${message}`, ...args);
      sendToDebugConsole("perf", message, args);
    }
  },

  network: (message: string, ...args: unknown[]) => {
    // Always capture network logs for debug reports
    DebugReportService.addLog("network", message, "NETWORK");

    if (isDebugMode) {
      log.debug(`🌐 [NETWORK] ${message}`, ...args);
      sendToDebugConsole("network", message, args);
    }
  },

  state: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.debug(`📊 [STATE] ${message}`, ...args);
      sendToDebugConsole("state", message, args);
    }
  },

  lifecycle: (message: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.info(`🔃 [LIFECYCLE] ${message}`, ...args);
      sendToDebugConsole("lifecycle", message, args);
    }
  },
};
