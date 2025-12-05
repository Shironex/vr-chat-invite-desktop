/**
 * Debug Report Service
 * Collects debug logs and system information, sends to webhook for troubleshooting
 */

import { app } from "electron";
import log from "electron-log";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { DEBUG_WEBHOOK_URL } from "../../config/secrets.config";
import { VRCHAT_GROUP } from "../../config/vrchat.config";
import { LogBufferService } from "./log-buffer.service";
import { InstanceLogBufferService } from "./instance-log-buffer.service";
import type { InviterLogEntry, InstanceLogEntry, InviterStats, InstanceMonitorStats } from "./vrchat-types";

// Maximum entries to include in debug report
const MAX_LOG_ENTRIES = 200;
const MAX_INTERNAL_LOGS = 500;

/**
 * Internal debug log entry (hidden from user UI)
 */
export interface InternalDebugLog {
  level: "info" | "warn" | "error" | "debug" | "network" | "ipc";
  message: string;
  timestamp: number;
  context?: string;
}

/**
 * Debug report payload
 */
export interface DebugReportPayload {
  // App info
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  osRelease: string;

  // Group info
  groupId: string;
  groupName: string;

  // User context (anonymized)
  isAuthenticated: boolean;
  isMonitoring: boolean;
  isInstanceMonitoring: boolean;

  // Stats
  inviterStats?: InviterStats;
  instanceStats?: InstanceMonitorStats;

  // Logs
  inviterLogs: InviterLogEntry[];
  instanceLogs: InstanceLogEntry[];
  internalLogs: InternalDebugLog[];

  // Timestamp
  reportedAt: number;
  userDescription?: string;
}

/**
 * Discord embed for debug report
 */
interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: { text: string };
  timestamp?: string;
}

/**
 * Debug Report Service
 * Singleton that collects internal logs and generates debug reports
 */
class DebugReportServiceClass {
  private internalLogs: InternalDebugLog[] = [];

  // Callbacks to get current state
  private getAuthStateCallback: (() => { isAuthenticated: boolean }) | null = null;
  private getMonitorStateCallback: (() => boolean) | null = null;
  private getInstanceMonitorStateCallback: (() => boolean) | null = null;
  private getInviterStatsCallback: (() => InviterStats) | null = null;
  private getInstanceStatsCallback: (() => InstanceMonitorStats) | null = null;

  /**
   * Check if debug webhook is configured
   */
  isConfigured(): boolean {
    return DEBUG_WEBHOOK_URL !== "" && DEBUG_WEBHOOK_URL.startsWith("https://discord.com/api/webhooks/");
  }

  /**
   * Add internal debug log (hidden from user UI)
   */
  addLog(level: InternalDebugLog["level"], message: string, context?: string): void {
    const entry: InternalDebugLog = {
      level,
      message,
      timestamp: Date.now(),
      context,
    };

    this.internalLogs.push(entry);

    // Keep only recent logs
    if (this.internalLogs.length > MAX_INTERNAL_LOGS) {
      this.internalLogs = this.internalLogs.slice(-MAX_INTERNAL_LOGS);
    }
  }

  /**
   * Get internal logs
   */
  getInternalLogs(): InternalDebugLog[] {
    return [...this.internalLogs];
  }

  /**
   * Clear internal logs
   */
  clearInternalLogs(): void {
    this.internalLogs = [];
  }

  /**
   * Set callback to get auth state
   */
  setAuthStateCallback(callback: () => { isAuthenticated: boolean }): void {
    this.getAuthStateCallback = callback;
  }

  /**
   * Set callback to get monitor state
   */
  setMonitorStateCallback(callback: () => boolean): void {
    this.getMonitorStateCallback = callback;
  }

  /**
   * Set callback to get instance monitor state
   */
  setInstanceMonitorStateCallback(callback: () => boolean): void {
    this.getInstanceMonitorStateCallback = callback;
  }

  /**
   * Set callback to get inviter stats
   */
  setInviterStatsCallback(callback: () => InviterStats): void {
    this.getInviterStatsCallback = callback;
  }

  /**
   * Set callback to get instance stats
   */
  setInstanceStatsCallback(callback: () => InstanceMonitorStats): void {
    this.getInstanceStatsCallback = callback;
  }

  /**
   * Collect all debug information into a payload
   */
  collectDebugPayload(userDescription?: string): DebugReportPayload {
    // Get logs from buffers
    const inviterLogs = LogBufferService.getLogs().slice(-MAX_LOG_ENTRIES);
    const instanceLogs = InstanceLogBufferService.getLogs().slice(-MAX_LOG_ENTRIES);
    const internalLogs = this.internalLogs.slice(-MAX_LOG_ENTRIES);

    // Get current state from callbacks
    const authState = this.getAuthStateCallback?.() ?? { isAuthenticated: false };
    const isMonitoring = this.getMonitorStateCallback?.() ?? false;
    const isInstanceMonitoring = this.getInstanceMonitorStateCallback?.() ?? false;
    const inviterStats = this.getInviterStatsCallback?.();
    const instanceStats = this.getInstanceStatsCallback?.();

    const payload: DebugReportPayload = {
      // App info
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),

      // Group info
      groupId: VRCHAT_GROUP.GROUP_ID,
      groupName: VRCHAT_GROUP.GROUP_NAME,

      // User context
      isAuthenticated: authState.isAuthenticated,
      isMonitoring,
      isInstanceMonitoring,

      // Stats
      inviterStats,
      instanceStats,

      // Logs
      inviterLogs,
      instanceLogs,
      internalLogs,

      // Timestamp
      reportedAt: Date.now(),
      userDescription,
    };

    return payload;
  }

  /**
   * Format log entries for Discord embed
   */
  private formatLogsForEmbed(logs: Array<{ timestamp: number; message: string }>, maxLength: number = 1000): string {
    if (logs.length === 0) return "*No logs*";

    let result = "";
    for (let i = logs.length - 1; i >= 0; i--) {
      const entry = logs[i];
      const time = new Date(entry.timestamp).toISOString().substring(11, 19);
      const line = `\`${time}\` ${entry.message}\n`;

      if (result.length + line.length > maxLength) break;
      result = line + result;
    }

    return result || "*No logs*";
  }

  /**
   * Send debug report to webhook
   */
  async sendReport(userDescription?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Debug webhook not configured" };
    }

    try {
      const payload = this.collectDebugPayload(userDescription);

      // Create summary embed
      const summaryEmbed: DiscordEmbed = {
        title: "🐛 Debug Report",
        description: userDescription || "*No description provided*",
        color: 0x5865f2, // Discord blurple
        fields: [
          {
            name: "App Version",
            value: `\`${payload.appVersion}\``,
            inline: true,
          },
          {
            name: "Platform",
            value: `\`${payload.platform} ${payload.arch}\``,
            inline: true,
          },
          {
            name: "OS",
            value: `\`${payload.osRelease}\``,
            inline: true,
          },
          {
            name: "Group",
            value: `\`${payload.groupName}\``,
            inline: true,
          },
          {
            name: "Authenticated",
            value: payload.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Monitoring",
            value: payload.isMonitoring ? "✅ Active" : "❌ Inactive",
            inline: true,
          },
        ],
        footer: { text: `Report ID: ${Date.now()}` },
        timestamp: new Date().toISOString(),
      };

      // Add stats if available
      if (payload.inviterStats) {
        summaryEmbed.fields?.push({
          name: "Inviter Stats",
          value: `Sent: **${payload.inviterStats.successful}** | Skipped: **${payload.inviterStats.skipped}** | Errors: **${payload.inviterStats.errors}** | Queue: **${payload.inviterStats.queueSize}**`,
          inline: false,
        });
      }

      // Create logs embed
      const logsEmbed: DiscordEmbed = {
        title: "📋 Recent Inviter Logs",
        description: this.formatLogsForEmbed(
          payload.inviterLogs.map(l => ({ timestamp: l.timestamp, message: `[${l.type}] ${l.message}` }))
        ),
        color: 0x3fb950,
      };

      // Create instance logs embed
      const instanceLogsEmbed: DiscordEmbed = {
        title: "🌐 Recent Instance Logs",
        description: this.formatLogsForEmbed(
          payload.instanceLogs.map(l => ({ timestamp: l.timestamp, message: `[${l.type}] ${l.message}` }))
        ),
        color: 0x58a6ff,
      };

      // Create internal logs embed (errors/warnings only)
      const errorLogs = payload.internalLogs.filter(l => l.level === "error" || l.level === "warn");
      const internalLogsEmbed: DiscordEmbed = {
        title: "⚠️ Internal Errors/Warnings",
        description: this.formatLogsForEmbed(
          errorLogs.map(l => ({ timestamp: l.timestamp, message: `[${l.level}] ${l.context ? `[${l.context}] ` : ""}${l.message}` }))
        ),
        color: 0xf85149,
      };

      // Send to webhook
      log.debug("🌐 [NETWORK] Sending debug report to webhook");

      const response = await fetch(DEBUG_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "VRChat Inviter Debug",
          embeds: [summaryEmbed, logsEmbed, instanceLogsEmbed, internalLogsEmbed],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`❌ Debug report webhook error: ${response.status} - ${errorText}`);
        return { success: false, error: `Webhook error: ${response.status}` };
      }

      // Send full payload as JSON file attachment
      const jsonPayload = JSON.stringify(payload, null, 2);
      const formData = new FormData();
      formData.append("payload_json", JSON.stringify({
        username: "VRChat Inviter Debug",
        content: "📎 Full debug payload attached below:",
      }));
      formData.append("files[0]", new Blob([jsonPayload], { type: "application/json" }), `debug-report-${Date.now()}.json`);

      await fetch(DEBUG_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      log.info("✅ Debug report sent successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ Failed to send debug report: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Read electron-log file for additional context
   */
  async readLogFile(): Promise<string | null> {
    try {
      const logPath = path.join(app.getPath("userData"), "logs", "debug.log");
      if (!fs.existsSync(logPath)) return null;

      const stats = fs.statSync(logPath);
      const maxSize = 50 * 1024; // 50KB max

      if (stats.size > maxSize) {
        // Read last 50KB
        const fd = fs.openSync(logPath, "r");
        const buffer = Buffer.alloc(maxSize);
        fs.readSync(fd, buffer, 0, maxSize, stats.size - maxSize);
        fs.closeSync(fd);
        return buffer.toString("utf-8");
      }

      return fs.readFileSync(logPath, "utf-8");
    } catch (error) {
      log.error(`❌ Failed to read log file: ${error}`);
      return null;
    }
  }
}

// Export singleton instance
export const DebugReportService = new DebugReportServiceClass();
