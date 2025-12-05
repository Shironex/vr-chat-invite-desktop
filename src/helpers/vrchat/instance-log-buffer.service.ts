/**
 * Instance Log Buffer Service
 * Stores instance monitor logs for UI persistence across navigation
 */

import type { InstanceLogEntry } from "./vrchat-types";

const MAX_BUFFER_SIZE = 500;

class InstanceLogBufferServiceClass {
  private logs: InstanceLogEntry[] = [];

  /**
   * Add a log entry to the buffer
   */
  add(entry: InstanceLogEntry): void {
    this.logs.push(entry);

    // Trim if buffer exceeds max size
    if (this.logs.length > MAX_BUFFER_SIZE) {
      this.logs = this.logs.slice(-MAX_BUFFER_SIZE);
    }
  }

  /**
   * Get all buffered logs
   */
  getLogs(): InstanceLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.logs.length;
  }
}

// Export singleton instance
export const InstanceLogBufferService = new InstanceLogBufferServiceClass();
