/**
 * VRChat Process Detection Service
 * Detects if VRChat is running on the system
 */

import { exec } from "child_process";
import { debugLog } from "../debug-mode";

const VRCHAT_PROCESS_NAME = "VRChat.exe";
const CHECK_INTERVAL = 5000; // Check every 5 seconds

type ProcessStatusCallback = (isRunning: boolean) => void;

class ProcessDetectionServiceClass {
  private isVRChatRunning = false;
  private isInitialized = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private callback: ProcessStatusCallback | null = null;

  /**
   * Check if VRChat process is currently running
   */
  async checkVRChatRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      // Use tasklist on Windows to check for VRChat.exe
      exec(
        `tasklist /FI "IMAGENAME eq ${VRCHAT_PROCESS_NAME}" /NH`,
        (error, stdout) => {
          if (error) {
            debugLog.error(`Process check error: ${error.message}`);
            resolve(false);
            return;
          }

          const isRunning = stdout.toLowerCase().includes("vrchat.exe");
          this.updateStatus(isRunning);
          resolve(isRunning);
        }
      );
    });
  }

  /**
   * Update the running status and notify callback if changed
   */
  private updateStatus(isRunning: boolean): void {
    const statusChanged = this.isVRChatRunning !== isRunning;
    this.isVRChatRunning = isRunning;

    // Only notify on actual changes after initialization
    if (statusChanged && this.isInitialized && this.callback) {
      debugLog.info(`VRChat process status changed: ${isRunning ? "running" : "not running"}`);
      try {
        this.callback(isRunning);
      } catch (error) {
        debugLog.error(`Callback error: ${error}`);
      }
    }
  }

  /**
   * Start periodic checking for VRChat process
   */
  startWatching(callback?: ProcessStatusCallback): void {
    // Set callback (overwrites any previous)
    if (callback) {
      this.callback = callback;
    }

    // Don't start multiple intervals
    if (this.checkInterval) {
      return;
    }

    debugLog.info("Starting VRChat process watcher");

    // Do an immediate check, then mark as initialized
    this.checkVRChatRunning().then(() => {
      this.isInitialized = true;
    });

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkVRChatRunning();
    }, CHECK_INTERVAL);
  }

  /**
   * Stop periodic checking
   */
  stopWatching(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      debugLog.info("Stopped VRChat process watcher");
    }
  }

  /**
   * Set callback to be notified when VRChat status changes
   */
  setCallback(callback: ProcessStatusCallback | null): void {
    this.callback = callback;
  }

  /**
   * Get current cached status (without checking)
   */
  getStatus(): boolean {
    return this.isVRChatRunning;
  }
}

// Export singleton instance
export const ProcessDetectionService = new ProcessDetectionServiceClass();
