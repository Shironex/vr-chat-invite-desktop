/**
 * Log Buffer Service
 * Stores recent logs in memory for persistence across navigation
 */

import type { InviterLogEntry } from "./vrchat-types";

const MAX_LOGS = 500;

class LogBufferServiceClass {
  private logs: InviterLogEntry[] = [];

  /**
   * Add a log entry to the buffer
   */
  add(entry: InviterLogEntry): void {
    this.logs.push(entry);
    // Keep only the most recent logs
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }
  }

  /**
   * Get all buffered logs
   */
  getLogs(): InviterLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get the number of buffered logs
   */
  getCount(): number {
    return this.logs.length;
  }
}

// Export singleton instance
export const LogBufferService = new LogBufferServiceClass();
