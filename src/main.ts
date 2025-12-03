import { app, BrowserWindow } from "electron";
import windowStateKeeper from "electron-window-state";
import registerListeners from "./helpers/ipc/listeners-register";
import { initializeAutoUpdater } from "./helpers/updater/auto-updater";
import { initializeDebugMode, debugLog, createDebugConsole } from "./helpers/debug-mode";
import { applyContentSecurityPolicy, preventExternalNavigation } from "./helpers/security/csp";
import { validateEnvironment, getDevServerUrl, isDevelopment } from "./helpers/env-validation";
import { APP_NAME, APP_ID, MAIN_WINDOW } from "./config/app.config";
import { windowRegistry } from "./helpers/window-registry";
import path from "path";

// Validate environment variables early
validateEnvironment();

const inDevelopment = isDevelopment();

// Initialize debug mode early
const debugMode = initializeDebugMode();

// Set app name for notifications and taskbar
app.setName(APP_NAME);

// Set App User Model ID for Windows notifications
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

function createWindow() {
  debugLog.info("Creating main window...");

  // Load window state (position, size, maximized state)
  const windowState = windowStateKeeper({
    defaultWidth: MAIN_WINDOW.width,
    defaultHeight: MAIN_WINDOW.height,
  });

  debugLog.info(`Window state: ${windowState.width}x${windowState.height} at (${windowState.x}, ${windowState.y})${windowState.isMaximized ? ' [maximized]' : ''}`);

  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    title: MAIN_WINDOW.title,
    webPreferences: {
      devTools: inDevelopment || debugMode,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,

      preload: preload,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 5, y: 5 } : undefined,
  });

  // Register window state management
  windowState.manage(mainWindow);

  // Register window in registry for debug console
  windowRegistry.register(mainWindow, "Main");

  registerListeners(mainWindow);

  // Prevent navigation to external URLs (additional layer of protection)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const url = new URL(navigationUrl);

    // Allow localhost for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return;
    }

    // Allow file:// protocol for local resources
    if (url.protocol === 'file:') {
      return;
    }

    // Block all other navigation
    event.preventDefault();
    debugLog.warn(`Prevented navigation to: ${navigationUrl}`);
  });

  // In development: load from vite dev server
  // In production: load from dist folder
  const devServerUrl = getDevServerUrl();
  if (devServerUrl) {
    debugLog.info(`Loading from dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    debugLog.info(`Loading from file: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Open DevTools automatically in debug mode
  if (debugMode) {
    mainWindow.webContents.openDevTools();
    debugLog.success("DevTools opened automatically (debug mode)");
  }

  debugLog.success("Main window created successfully");
}

async function installExtensions() {
  // Only install devtools in development mode
  if (!inDevelopment) {
    return;
  }

  try {
    // Dynamically import electron-devtools-installer only in development
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import(
      "electron-devtools-installer"
    );
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch (error) {
    console.error("Failed to install extensions:", error);
  }
}

app
  .whenReady()
  .then(() => {
    // Apply Content Security Policy after app is ready
    applyContentSecurityPolicy(inDevelopment);

    // Prevent navigation to external URLs
    preventExternalNavigation();
  })
  .then(createWindow)
  .then(installExtensions)
  .then(() => {
    // Initialize auto-updater after app is ready
    initializeAutoUpdater(inDevelopment);

    // Create debug console window if in debug mode
    if (debugMode) {
      // Wait a bit for main window to be ready
      setTimeout(() => {
        createDebugConsole();
      }, 1000);
    }
  });

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
