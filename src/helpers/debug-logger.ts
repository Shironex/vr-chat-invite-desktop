/**
 * Debug logger for renderer process
 * Sends logs to main process for colored console output
 */
export const debugLog = {
  info: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.info(message, ...args);
    }
  },

  success: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.success(message, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.warn(message, ...args);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.error(message, ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.debug(message, ...args);
    }
  },

  /**
   * Log routing/navigation events
   */
  route: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.route(message, ...args);
    }
  },

  /**
   * Log IPC operations
   */
  ipc: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.ipc(message, ...args);
    }
  },

  /**
   * Log auto-updater events
   */
  updater: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.updater(message, ...args);
    }
  },

  /**
   * Log performance metrics (render times, load times, etc.)
   */
  perf: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.perf(message, ...args);
    }
  },

  /**
   * Log network/fetch requests
   */
  network: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.network(message, ...args);
    }
  },

  /**
   * Log state changes (stores, contexts, etc.)
   */
  state: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.state(message, ...args);
    }
  },

  /**
   * Log app lifecycle events (focus, blur, visibility, etc.)
   */
  lifecycle: (message: string, ...args: unknown[]) => {
    if (window.debugAPI) {
      window.debugAPI.lifecycle(message, ...args);
    }
  },
};
