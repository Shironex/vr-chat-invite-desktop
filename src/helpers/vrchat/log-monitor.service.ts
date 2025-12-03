/**
 * VRChat Log Monitor Service
 * Watches VRChat log files to detect joining players
 * Adapted from Python: C:\Users\shirone\Downloads\Inv\Inv\vrchat-group-inviter\src\inviter\player_detector.py
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { watch, FSWatcher } from "chokidar";
import { debugLog } from "../debug-mode";
import { VRCHAT_PATHS, MONITOR_CONFIG } from "../../config/vrchat.config";
import type { DetectedPlayer, MonitorStatus } from "./vrchat-types";

// Callback type for player detection
type OnPlayerJoinCallback = (player: DetectedPlayer) => void;

/**
 * Log Monitor Service Singleton
 */
class LogMonitorServiceClass {
  private isRunning = false;
  private logDirectory: string | null = null;
  private currentLogFile: string | null = null;
  private fileHandle: fs.promises.FileHandle | null = null;
  private filePosition = 0;
  private watcher: FSWatcher | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private onPlayerJoinCallback: OnPlayerJoinCallback | null = null;
  private lastActivity: number = 0;

  /**
   * Find VRChat log directory
   */
  private findLogDirectory(): string | null {
    // Expand %LOCALAPPDATA%Low
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      debugLog.error("LOCALAPPDATA environment variable not found");
      return null;
    }

    // Try configured path first
    const configuredPath = path.normalize(
      VRCHAT_PATHS.LOG_DIRECTORY.replace("%LOCALAPPDATA%Low", path.join(localAppData, "..", "LocalLow"))
    );

    if (fs.existsSync(configuredPath)) {
      debugLog.info(`Using configured log path: ${configuredPath}`);
      return configuredPath;
    }

    // Try common paths
    const possiblePaths = [
      path.join(localAppData, "..", "LocalLow", "VRChat", "VRChat"),
      path.join(os.homedir(), "AppData", "LocalLow", "VRChat", "VRChat"),
    ];

    for (const p of possiblePaths) {
      const normalizedPath = path.normalize(p);
      if (fs.existsSync(normalizedPath)) {
        debugLog.info(`Found log directory: ${normalizedPath}`);
        return normalizedPath;
      }
    }

    debugLog.error("VRChat log directory not found");
    return null;
  }

  /**
   * Get the latest log file in the directory
   */
  private getLatestLogFile(): string | null {
    if (!this.logDirectory) return null;

    try {
      const files = fs.readdirSync(this.logDirectory);
      const logFiles: { path: string; mtime: number }[] = [];

      for (const file of files) {
        if (file.startsWith("output_log_") && file.endsWith(".txt")) {
          const filePath = path.join(this.logDirectory, file);
          const stats = fs.statSync(filePath);
          logFiles.push({ path: filePath, mtime: stats.mtimeMs });
        }
      }

      if (logFiles.length === 0) {
        debugLog.warn("No VRChat log files found");
        return null;
      }

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime - a.mtime);
      return logFiles[0].path;
    } catch (error) {
      debugLog.error(`Error finding log file: ${error}`);
      return null;
    }
  }

  /**
   * Process a single log line
   */
  private processLogLine(line: string): void {
    // Check for player join pattern
    const joinMatch = MONITOR_CONFIG.PATTERNS.JOIN.exec(line);
    if (!joinMatch) return;

    const displayName = joinMatch[1].trim();

    // Try to extract user ID from the same line or nearby
    const userIdMatch = MONITOR_CONFIG.PATTERNS.USER_ID.exec(line);

    if (userIdMatch) {
      const userId = userIdMatch[0];
      this.lastActivity = Date.now();

      debugLog.info(`Player joined: ${displayName} (${userId})`);

      if (this.onPlayerJoinCallback) {
        const player: DetectedPlayer = {
          userId,
          displayName,
          timestamp: Date.now(),
        };
        this.onPlayerJoinCallback(player);
      }
    } else {
      // Player joined but no user ID found in line
      debugLog.debug(`Player joined but no ID: ${displayName}`);
    }
  }

  /**
   * Read new lines from the log file
   */
  private async readNewLines(): Promise<void> {
    if (!this.currentLogFile || !this.fileHandle) return;

    try {
      // Get current file size
      const stats = fs.statSync(this.currentLogFile);

      // If file was truncated (new session), reset position
      if (stats.size < this.filePosition) {
        debugLog.info("Log file was truncated, resetting position");
        this.filePosition = 0;
      }

      // Check if there's new data
      if (stats.size <= this.filePosition) return;

      // Read new content
      const buffer = Buffer.alloc(stats.size - this.filePosition);
      const { bytesRead } = await this.fileHandle.read(
        buffer,
        0,
        buffer.length,
        this.filePosition
      );

      if (bytesRead > 0) {
        const content = buffer.toString("utf-8", 0, bytesRead);
        const lines = content.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            this.processLogLine(line);
          }
        }

        this.filePosition += bytesRead;
      }
    } catch (error) {
      debugLog.error(`Error reading log file: ${error}`);
    }
  }

  /**
   * Switch to a new log file
   */
  private async switchToLogFile(filePath: string): Promise<boolean> {
    try {
      // Close existing handle
      if (this.fileHandle) {
        await this.fileHandle.close();
        this.fileHandle = null;
      }

      // Open new file
      this.fileHandle = await fs.promises.open(filePath, "r");
      this.currentLogFile = filePath;

      // Seek to end of file (only process new lines)
      const stats = fs.statSync(filePath);
      this.filePosition = stats.size;

      debugLog.success(`Monitoring log file: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      debugLog.error(`Failed to switch to log file: ${error}`);
      return false;
    }
  }

  /**
   * Start monitoring log files
   */
  async start(onPlayerJoin: OnPlayerJoinCallback): Promise<boolean> {
    if (this.isRunning) {
      debugLog.warn("Monitor already running");
      return true;
    }

    this.onPlayerJoinCallback = onPlayerJoin;

    // Find log directory
    this.logDirectory = this.findLogDirectory();
    if (!this.logDirectory) {
      debugLog.error("Cannot start monitor: log directory not found");
      return false;
    }

    // Find latest log file
    const latestLog = this.getLatestLogFile();
    if (!latestLog) {
      debugLog.warn("No log files found, waiting for VRChat to start...");
    } else {
      await this.switchToLogFile(latestLog);
    }

    // Watch for new log files
    this.watcher = watch(this.logDirectory, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on("add", async (filePath) => {
      if (path.basename(filePath).startsWith("output_log_")) {
        debugLog.info(`New log file detected: ${path.basename(filePath)}`);
        await this.switchToLogFile(filePath);
      }
    });

    this.watcher.on("change", async (filePath) => {
      if (filePath === this.currentLogFile) {
        await this.readNewLines();
      }
    });

    // Start polling interval as backup (chokidar change events can be unreliable on Windows)
    this.pollInterval = setInterval(async () => {
      if (this.currentLogFile) {
        await this.readNewLines();
      } else {
        // Try to find a log file if we don't have one
        const latestLog = this.getLatestLogFile();
        if (latestLog) {
          await this.switchToLogFile(latestLog);
        }
      }
    }, MONITOR_CONFIG.POLL_INTERVAL);

    this.isRunning = true;
    this.lastActivity = Date.now();
    debugLog.success(`Log monitor started: ${this.logDirectory}`);
    return true;
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Stop watching
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Close file handle
    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = null;
    }

    this.isRunning = false;
    this.currentLogFile = null;
    this.filePosition = 0;
    this.onPlayerJoinCallback = null;

    debugLog.info("Log monitor stopped");
  }

  /**
   * Get monitor status
   */
  getStatus(): MonitorStatus {
    return {
      isRunning: this.isRunning,
      logFilePath: this.currentLogFile || undefined,
      lastActivity: this.lastActivity || undefined,
    };
  }

  /**
   * Check if running
   */
  isMonitorRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const LogMonitorService = new LogMonitorServiceClass();
