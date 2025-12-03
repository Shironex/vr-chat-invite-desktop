import { contextBridge, ipcRenderer } from "electron";
import { DEBUG_CHANNELS } from "./debug-channels";

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

/**
 * Expose debug logging API to renderer process
 */
export function exposeDebugContext(): void {
  contextBridge.exposeInMainWorld("debugAPI", {
    log: (level: DebugLogLevel, message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level, message, args });
    },

    info: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "info", message, args });
    },

    success: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "success", message, args });
    },

    warn: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "warn", message, args });
    },

    error: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "error", message, args });
    },

    debug: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "debug", message, args });
    },

    route: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "route", message, args });
    },

    ipc: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "ipc", message, args });
    },

    updater: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "updater", message, args });
    },

    perf: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "perf", message, args });
    },

    network: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "network", message, args });
    },

    state: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "state", message, args });
    },

    lifecycle: (message: string, ...args: unknown[]) => {
      ipcRenderer.send(DEBUG_CHANNELS.LOG, { level: "lifecycle", message, args });
    },
  });
}
