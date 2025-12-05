/**
 * VRChat IPC Channel Constants
 */

export const VRCHAT_CHANNELS = {
  // Authentication
  AUTH_LOGIN: "vrchat:auth:login",
  AUTH_LOGOUT: "vrchat:auth:logout",
  AUTH_VERIFY_2FA: "vrchat:auth:verify2fa",
  AUTH_GET_STATE: "vrchat:auth:getState",
  AUTH_VALIDATE_SESSION: "vrchat:auth:validateSession",

  // Auth Events (main -> renderer)
  AUTH_STATE_CHANGED: "vrchat:auth:stateChanged",
  AUTH_2FA_REQUIRED: "vrchat:auth:2faRequired",

  // Log Monitor
  MONITOR_START: "vrchat:monitor:start",
  MONITOR_STOP: "vrchat:monitor:stop",
  MONITOR_GET_STATUS: "vrchat:monitor:getStatus",

  // Monitor Events (main -> renderer)
  MONITOR_STATUS_CHANGED: "vrchat:monitor:statusChanged",
  MONITOR_PLAYER_DETECTED: "vrchat:monitor:playerDetected",

  // Invite System
  INVITE_QUEUE_ADD: "vrchat:invite:queueAdd",
  INVITE_QUEUE_CLEAR: "vrchat:invite:queueClear",
  INVITE_GET_STATS: "vrchat:invite:getStats",
  INVITE_GET_QUEUE: "vrchat:invite:getQueue",

  // Invite Events (main -> renderer)
  INVITE_RESULT: "vrchat:invite:result",
  INVITE_STATS_UPDATED: "vrchat:invite:statsUpdated",
  INVITE_QUEUE_UPDATED: "vrchat:invite:queueUpdated",

  // Logging Events (main -> renderer)
  LOG_ENTRY: "vrchat:log:entry",
  LOG_GET_BUFFER: "vrchat:log:getBuffer",
  LOG_CLEAR: "vrchat:log:clear",

  // VRChat Launcher
  LAUNCH_VRCHAT: "vrchat:launch",

  // Settings
  SETTINGS_GET: "vrchat:settings:get",
  SETTINGS_SET: "vrchat:settings:set",
  SETTINGS_RESET: "vrchat:settings:reset",

  // VRChat Path
  PATH_GET: "vrchat:path:get",
  PATH_SET: "vrchat:path:set",
  PATH_BROWSE: "vrchat:path:browse",
  PATH_DETECT: "vrchat:path:detect",

  // Group Info
  GROUP_GET_INFO: "vrchat:group:getInfo",

  // Process Detection
  PROCESS_CHECK: "vrchat:process:check",
  PROCESS_GET_STATUS: "vrchat:process:getStatus",
  PROCESS_START_WATCHING: "vrchat:process:startWatching",
  PROCESS_STOP_WATCHING: "vrchat:process:stopWatching",
  PROCESS_STATUS_CHANGED: "vrchat:process:statusChanged",

  // Invite History
  HISTORY_GET: "vrchat:history:get",
  HISTORY_GET_STATS: "vrchat:history:getStats",
  HISTORY_EXPORT_CSV: "vrchat:history:exportCSV",
  HISTORY_CLEAR: "vrchat:history:clear",

  // Session Statistics
  SESSION_STATS_GET: "vrchat:session:getStats",
  SESSION_STATS_GET_ACTIVE: "vrchat:session:getActive",
  SESSION_STATS_CLEAR: "vrchat:session:clear",
  SESSION_STATS_UPDATED: "vrchat:session:updated",

  // Webhook Settings
  WEBHOOK_SETTINGS_GET: "vrchat:webhooks:get",
  WEBHOOK_SETTINGS_SET: "vrchat:webhooks:set",
  WEBHOOK_SETTINGS_RESET: "vrchat:webhooks:reset",

  // Language Settings
  LANGUAGE_GET: "vrchat:language:get",
  LANGUAGE_SET: "vrchat:language:set",

  // ─────────────────────────────────────────────────────────────────
  // Instance Monitor
  // ─────────────────────────────────────────────────────────────────

  // Instance Monitor Control
  INSTANCE_MONITOR_START: "vrchat:instance:start",
  INSTANCE_MONITOR_STOP: "vrchat:instance:stop",
  INSTANCE_MONITOR_GET_STATUS: "vrchat:instance:getStatus",
  INSTANCE_MONITOR_GET_STATS: "vrchat:instance:getStats",
  INSTANCE_MONITOR_RESET_STATS: "vrchat:instance:resetStats",

  // Instance Monitor Events (main -> renderer)
  INSTANCE_MONITOR_STATUS_CHANGED: "vrchat:instance:statusChanged",
  INSTANCE_EVENT: "vrchat:instance:event",
  INSTANCE_LOG_ENTRY: "vrchat:instance:logEntry",
  INSTANCE_STATS_UPDATED: "vrchat:instance:statsUpdated",

  // Instance Log Buffer
  INSTANCE_LOG_GET_BUFFER: "vrchat:instance:getBuffer",
  INSTANCE_LOG_CLEAR: "vrchat:instance:clearBuffer",

  // Instance Webhook Settings
  INSTANCE_WEBHOOK_GET: "vrchat:instance:webhookGet",
  INSTANCE_WEBHOOK_SET: "vrchat:instance:webhookSet",
  INSTANCE_WEBHOOK_RESET: "vrchat:instance:webhookReset",

  // Instance Local User (for detecting own world changes)
  INSTANCE_SET_LOCAL_USER: "vrchat:instance:setLocalUser",

  // ─────────────────────────────────────────────────────────────────
  // Debug Report
  // ─────────────────────────────────────────────────────────────────

  // Debug Report Control
  DEBUG_REPORT_SEND: "vrchat:debug:sendReport",
  DEBUG_REPORT_IS_CONFIGURED: "vrchat:debug:isConfigured",
} as const;

export type VRChatChannel =
  (typeof VRCHAT_CHANNELS)[keyof typeof VRCHAT_CHANNELS];
