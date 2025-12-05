/**
 * Instance Monitor Service
 * Watches VRChat log files for world changes and player join/leave events
 * Does NOT require VRChat API authentication
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { watch, FSWatcher } from "chokidar";
import { debugLog } from "../debug-mode";
import { VRCHAT_PATHS, INSTANCE_MONITOR_CONFIG } from "../../config/vrchat.config";
import type {
  InstanceEvent,
  InstanceMonitorStatus,
  InstanceMonitorStats,
} from "./vrchat-types";

// Callback type for instance events
type OnInstanceEventCallback = (event: InstanceEvent) => void;

/**
 * Instance Monitor Service Singleton
 */
class InstanceMonitorServiceClass {
  private isRunning = false;
  private isReading = false; // Mutex to prevent concurrent readNewLines calls
  private logDirectory: string | null = null;
  private currentLogFile: string | null = null;
  private fileHandle: fs.promises.FileHandle | null = null;
  private filePosition = 0;
  private watcher: FSWatcher | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private onInstanceEventCallback: OnInstanceEventCallback | null = null;
  private lastActivity: number = 0;

  // Current world state
  private currentWorld: string | null = null;
  private currentWorldId: string | null = null;
  private currentInstanceId: string | null = null;
  private currentRegion: string | null = null;

  // Local user tracking (to detect when WE leave, not others)
  private localUserDisplayName: string | null = null;
  private isInWorldTransition = false;

  // Statistics
  private stats: InstanceMonitorStats = {
    playersJoined: 0,
    playersLeft: 0,
    worldChanges: 0,
  };

  /**
   * Find VRChat log directory
   */
  private findLogDirectory(): string | null {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      debugLog.error("LOCALAPPDATA environment variable not found");
      return null;
    }

    // Try configured path first
    const configuredPath = path.normalize(
      VRCHAT_PATHS.LOG_DIRECTORY.replace(
        "%LOCALAPPDATA%Low",
        path.join(localAppData, "..", "LocalLow")
      )
    );

    if (fs.existsSync(configuredPath)) {
      debugLog.info(`[Instance] Using configured log path: ${configuredPath}`);
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
        debugLog.info(`[Instance] Found log directory: ${normalizedPath}`);
        return normalizedPath;
      }
    }

    debugLog.error("[Instance] VRChat log directory not found");
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
        debugLog.warn("[Instance] No VRChat log files found");
        return null;
      }

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime - a.mtime);
      return logFiles[0].path;
    } catch (error) {
      debugLog.error(`[Instance] Error finding log file: ${error}`);
      return null;
    }
  }

  /**
   * Process a single log line for instance events
   */
  private processLogLine(line: string): void {
    const { PATTERNS } = INSTANCE_MONITOR_CONFIG;
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Check for world entry - this clears the transition state
    const worldMatch = PATTERNS.WORLD_ENTER.exec(trimmedLine);
    if (worldMatch) {
      const worldName = worldMatch[1].trim();
      this.currentWorld = worldName;
      this.stats.worldChanges++;
      this.lastActivity = Date.now();

      // Clear transition state - we've entered a new world
      if (this.isInWorldTransition) {
        debugLog.info(`[Instance] World transition complete, entered: ${worldName}`);
        this.isInWorldTransition = false;
      } else {
        debugLog.info(`[Instance] Entered world: ${worldName}`);
      }

      if (this.onInstanceEventCallback) {
        const event: InstanceEvent = {
          type: "world_enter",
          timestamp: Date.now(),
          worldName,
          worldId: this.currentWorldId || undefined,
          instanceId: this.currentInstanceId || undefined,
          region: this.currentRegion || undefined,
        };
        this.onInstanceEventCallback(event);
      }
      return;
    }

    // Check for instance join (get world ID, instance ID, and region)
    const instanceMatch = PATTERNS.INSTANCE_JOIN.exec(trimmedLine);
    if (instanceMatch) {
      this.currentWorldId = instanceMatch[1];
      this.currentInstanceId = instanceMatch[2];
      this.currentRegion = instanceMatch[3] || null;
      debugLog.debug(
        `[Instance] Instance info: ${this.currentWorldId}:${this.currentInstanceId} region=${this.currentRegion}`
      );
      return;
    }

    // Check for player join
    const joinMatch = PATTERNS.PLAYER_JOIN.exec(trimmedLine);
    if (joinMatch) {
      const displayName = joinMatch[1].trim();
      const userId = joinMatch[2];
      this.stats.playersJoined++;
      this.lastActivity = Date.now();

      debugLog.info(`[Instance] Player joined: ${displayName} (${userId})`);

      if (this.onInstanceEventCallback) {
        const event: InstanceEvent = {
          type: "player_join",
          timestamp: Date.now(),
          worldName: this.currentWorld || undefined,
          worldId: this.currentWorldId || undefined,
          userId,
          displayName,
        };
        this.onInstanceEventCallback(event);
      }
      return;
    }

    // Check for player leave
    const leaveMatch = PATTERNS.PLAYER_LEAVE.exec(trimmedLine);
    if (leaveMatch) {
      const displayName = leaveMatch[1].trim();
      const userId = leaveMatch[2];
      this.lastActivity = Date.now();

      // Check if this is the local user leaving (we're changing worlds)
      if (this.localUserDisplayName && displayName === this.localUserDisplayName) {
        debugLog.info(`[Instance] Local user leaving, starting world transition`);
        this.isInWorldTransition = true;
        // Don't count our own leave or send event
        return;
      }

      // If we're in world transition, suppress leave events (they're false positives)
      if (this.isInWorldTransition) {
        debugLog.debug(`[Instance] Suppressing leave event during world transition: ${displayName}`);
        return;
      }

      this.stats.playersLeft++;
      debugLog.info(`[Instance] Player left: ${displayName} (${userId})`);

      if (this.onInstanceEventCallback) {
        const event: InstanceEvent = {
          type: "player_leave",
          timestamp: Date.now(),
          worldName: this.currentWorld || undefined,
          worldId: this.currentWorldId || undefined,
          userId,
          displayName,
        };
        this.onInstanceEventCallback(event);
      }
      return;
    }
  }

  /**
   * Read new lines from the log file
   * Uses mutex to prevent concurrent calls from watcher and poll interval
   */
  private async readNewLines(): Promise<void> {
    // Mutex: prevent concurrent reads
    if (this.isReading) return;
    if (!this.currentLogFile || !this.fileHandle) return;

    this.isReading = true;
    try {
      // Get current file size
      const stats = fs.statSync(this.currentLogFile);

      // If file was truncated (new session), reset position
      if (stats.size < this.filePosition) {
        debugLog.info("[Instance] Log file was truncated, resetting position");
        this.filePosition = 0;
        // Reset world state on new session
        this.currentWorld = null;
        this.currentWorldId = null;
        this.currentInstanceId = null;
        this.currentRegion = null;
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
      debugLog.error(`[Instance] Error reading log file: ${error}`);
    } finally {
      this.isReading = false;
    }
  }

  /**
   * Find the current world by scanning the log file backwards
   * This is called when starting monitoring to detect the current world state
   */
  private findCurrentWorldInLog(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      // Split by both \r\n and \n to handle different line endings
      const lines = content.split(/\r?\n/).reverse();
      const { PATTERNS } = INSTANCE_MONITOR_CONFIG;

      debugLog.debug(`[Instance] Scanning ${lines.length} lines for world info...`);

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Find the most recent world entry
        const worldMatch = PATTERNS.WORLD_ENTER.exec(trimmedLine);
        if (worldMatch) {
          this.currentWorld = worldMatch[1].trim();
          debugLog.info(`[Instance] Found current world: ${this.currentWorld}`);
          break;
        }
      }

      // Also find instance info if available
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const instanceMatch = PATTERNS.INSTANCE_JOIN.exec(trimmedLine);
        if (instanceMatch) {
          this.currentWorldId = instanceMatch[1];
          this.currentInstanceId = instanceMatch[2];
          this.currentRegion = instanceMatch[3] || null;
          debugLog.debug(
            `[Instance] Found instance info: ${this.currentWorldId}:${this.currentInstanceId}`
          );
          break;
        }
      }

      if (!this.currentWorld) {
        debugLog.warn("[Instance] Could not find current world in log file");
      }
    } catch (error) {
      debugLog.warn(`[Instance] Could not scan log for world info: ${error}`);
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

      // Reset world state on file switch
      this.currentWorld = null;
      this.currentWorldId = null;
      this.currentInstanceId = null;
      this.currentRegion = null;

      // Find current world by scanning the log
      this.findCurrentWorldInLog(filePath);

      // Open new file
      this.fileHandle = await fs.promises.open(filePath, "r");
      this.currentLogFile = filePath;

      // Seek to end of file (only process new lines)
      const stats = fs.statSync(filePath);
      this.filePosition = stats.size;

      debugLog.success(`[Instance] Monitoring log file: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      debugLog.error(`[Instance] Failed to switch to log file: ${error}`);
      return false;
    }
  }

  /**
   * Start monitoring log files
   */
  async start(onInstanceEvent: OnInstanceEventCallback): Promise<boolean> {
    if (this.isRunning) {
      debugLog.warn("[Instance] Monitor already running");
      return true;
    }

    this.onInstanceEventCallback = onInstanceEvent;

    // Find log directory
    this.logDirectory = this.findLogDirectory();
    if (!this.logDirectory) {
      debugLog.error("[Instance] Cannot start monitor: log directory not found");
      return false;
    }

    // Find latest log file
    const latestLog = this.getLatestLogFile();
    if (!latestLog) {
      debugLog.warn("[Instance] No log files found, waiting for VRChat to start...");
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
        debugLog.info(`[Instance] New log file detected: ${path.basename(filePath)}`);
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
    }, INSTANCE_MONITOR_CONFIG.POLL_INTERVAL);

    this.isRunning = true;
    this.lastActivity = Date.now();
    debugLog.success(`[Instance] Monitor started: ${this.logDirectory}`);
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
    this.onInstanceEventCallback = null;

    debugLog.info("[Instance] Monitor stopped");
  }

  /**
   * Get monitor status
   */
  getStatus(): InstanceMonitorStatus {
    return {
      isRunning: this.isRunning,
      logFilePath: this.currentLogFile || undefined,
      lastActivity: this.lastActivity || undefined,
      currentWorld: this.currentWorld || undefined,
      currentWorldId: this.currentWorldId || undefined,
    };
  }

  /**
   * Get current statistics
   */
  getStats(): InstanceMonitorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      playersJoined: 0,
      playersLeft: 0,
      worldChanges: 0,
    };
  }

  /**
   * Check if running
   */
  isMonitorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current world name
   */
  getCurrentWorld(): string | null {
    return this.currentWorld;
  }

  /**
   * Set the local user's display name (from VRChat auth)
   * This is used to detect when WE leave a world vs when others leave
   */
  setLocalUserDisplayName(displayName: string | null): void {
    this.localUserDisplayName = displayName;
    debugLog.info(`[Instance] Local user display name set: ${displayName || "none"}`);
  }

  /**
   * Get the local user's display name
   */
  getLocalUserDisplayName(): string | null {
    return this.localUserDisplayName;
  }
}

// Export singleton instance
export const InstanceMonitorService = new InstanceMonitorServiceClass();
