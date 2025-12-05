/**
 * VRChat Group Inviter Configuration
 *
 * HARDCODED - Change these values before building for your friend!
 */

import type { RateLimitSettings } from "../helpers/vrchat/vrchat-types";

/**
 * VRChat API Configuration
 */
export const VRCHAT_API = {
  BASE_URL: "https://api.vrchat.cloud/api/1",
  USER_AGENT: "VRChat-Group-Inviter/1.0",
} as const;

/**
 * Group to invite users to
 * CHANGE THIS to your friend's group ID!
 */
export const VRCHAT_GROUP = {
  // The group ID to invite detected players to
  // Format: grp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  GROUP_ID: "grp_e5836c3f-da33-4491-b104-33a287cdd171", // <-- SET THIS!

  // Optional: Group name for display purposes
  GROUP_NAME: "Blokersi", // <-- SET THIS!
} as const;

/**
 * Discord Webhook Configuration
 * NOTE: Webhook URLs are now configured in Settings > Discord Webhooks
 * These are just the batch processing parameters
 */
export const DISCORD_WEBHOOKS = {
  // Batch delay before sending webhooks (seconds)
  BATCH_DELAY: 5,

  // Maximum webhooks per batch
  MAX_BATCH_SIZE: 4,
} as const;

/**
 * VRChat Log File Path
 * Default Windows location - adjust if needed
 */
export const VRCHAT_PATHS = {
  // VRChat log directory (uses %LOCALAPPDATA%Low)
  LOG_DIRECTORY: "%LOCALAPPDATA%Low\\VRChat\\VRChat",

  // VRChat executable path (Steam default)
  EXECUTABLE:
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\VRChat\\launch.exe",
} as const;

/**
 * Default Rate Limit Settings
 * These are the defaults - users can customize in settings
 */
export const DEFAULT_RATE_LIMITS: RateLimitSettings = {
  // Number of invites to send before pausing
  inviteBatchCount: 8,

  // Delay in seconds after each batch
  inviteBatchDelay: 12,

  // Delay in seconds between individual invites
  inviteDelayBetween: 2,

  // If queue exceeds this size, pause processing
  queueThreshold: 88,

  // How long to pause when threshold is hit (seconds)
  queuePauseDelay: 600, // 10 minutes
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  // How often to validate the session (ms)
  VALIDATION_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // Session expiration time (ms)
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours

  // Storage key for encrypted session
  STORAGE_KEY: "vrchat-session",
} as const;

/**
 * Log Monitor Configuration
 */
export const MONITOR_CONFIG = {
  // How often to check for new log entries (ms)
  POLL_INTERVAL: 500,

  // Log file pattern
  LOG_FILE_PATTERN: "output_log_*.txt",

  // Regex patterns for detecting players
  PATTERNS: {
    // Player join pattern - captures display name (stops before user ID in parentheses)
    JOIN: /\[Behaviour\] OnPlayerJoined\s+(.+?)\s*\(usr_/,

    // User ID pattern - usr_[uuid]
    USER_ID: /usr_[a-f0-9-]+/i,
  },
} as const;

/**
 * Instance Monitor Configuration
 * Patterns for detecting world changes and player join/leave events
 */
export const INSTANCE_MONITOR_CONFIG = {
  // How often to check for new log entries (ms)
  POLL_INTERVAL: 500,

  // Regex patterns for instance monitoring
  PATTERNS: {
    // World entry: [Behaviour] Entering Room: World Name
    // Note: Using (.+?) with lookahead to handle Windows line endings (\r\n)
    WORLD_ENTER: /\[Behaviour\] Entering Room: (.+?)[\r\n]*$/,

    // Instance join: [Behaviour] Joining wrld_xxx:instanceId~...~region(xx)
    INSTANCE_JOIN:
      /\[Behaviour\] Joining (wrld_[a-f0-9-]+):([^~\s]+)(?:~.*region\(([a-z]+)\))?/i,

    // Player join: [Behaviour] OnPlayerJoined DisplayName (usr_xxx)
    PLAYER_JOIN: /\[Behaviour\] OnPlayerJoined\s+(.+?)\s*\((usr_[a-f0-9-]+)\)/i,

    // Player leave: [Behaviour] OnPlayerLeft DisplayName (usr_xxx)
    PLAYER_LEAVE: /\[Behaviour\] OnPlayerLeft\s+(.+?)\s*\((usr_[a-f0-9-]+)\)/i,
  },
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Maximum log entries to keep in memory
  MAX_LOG_ENTRIES: 1000,

  // Log entry colors by type
  LOG_COLORS: {
    detect: "#58a6ff", // blue
    invite: "#3fb950", // green
    skip: "#d29922", // yellow
    error: "#f85149", // red
    auth: "#a371f7", // purple
    rate: "#ffa500", // orange
    queue: "#4ecdc4", // cyan
    system: "#8b949e", // gray
  },

  // Log entry emojis by type
  LOG_EMOJIS: {
    detect: "\u{1F441}\uFE0F", // eye
    invite: "\u2705", // check
    skip: "\u23ED\uFE0F", // skip
    error: "\u274C", // x
    auth: "\u{1F510}", // lock
    rate: "\u26A0\uFE0F", // warning
    queue: "\u{1F4CB}", // clipboard
    system: "\u2699\uFE0F", // gear
  },
} as const;
