/**
 * Centralized Application Configuration
 *
 * Update these values to customize your app's identity.
 * This is the single source of truth for all app metadata.
 *
 * IMPORTANT: After changing these values:
 * 1. Update package.json manually (name, productName, build.appId, build.nsis.shortcutName)
 * 2. Rebuild the app (pnpm run build or pnpm run dist:dir)
 * 3. Clear any cached builds if necessary
 */

/**
 * Application Display Name
 * Used in: window titles, i18n translations, notifications
 */
export const APP_NAME = "VRChat Group Inviter";

/**
 * Application ID (reverse domain notation)
 * Used in: Windows notifications (appUserModelId)
 * Should match package.json's build.appId
 */
export const APP_ID = "com.vrchat.group-inviter";

/**
 * Product Name (same as APP_NAME in most cases)
 * Should match package.json's productName
 */
export const PRODUCT_NAME = "VRChat Group Inviter";

/**
 * Main Window Configuration
 */
export const MAIN_WINDOW = {
  title: "VRChat Group Inviter",
  width: 1000,
  height: 750,
};

/**
 * Debug Console Configuration
 */
export const DEBUG_CONSOLE = {
  title: "VRChat Group Inviter - Debug Console",
  width: 1000,
  height: 600,
  backgroundColor: "#0d1117",
};

/**
 * HTML Page Title
 * Used in: index.html <title> tag
 */
export const HTML_TITLE = "VRChat Group Inviter";

/**
 * GitHub Repository Configuration
 * Used for: changelog history, release notes
 * Should match package.json's build.publish section
 */
export const GITHUB_CONFIG = {
  owner: "Shironex",
  repo: "vr-chat-invite-desktop",
};

/**
 * System Tray Configuration
 */
export const TRAY_CONFIG = {
  defaults: {
    minimizeToTray: false,
    showDesktopNotifications: false,
  },
};

/**
 * Combined App Configuration
 * Provides a single export for all app settings
 */
export const APP_CONFIG = {
  name: APP_NAME,
  id: APP_ID,
  productName: PRODUCT_NAME,
  mainWindow: MAIN_WINDOW,
  debugConsole: DEBUG_CONSOLE,
  htmlTitle: HTML_TITLE,
  github: GITHUB_CONFIG,
  tray: TRAY_CONFIG,
};
