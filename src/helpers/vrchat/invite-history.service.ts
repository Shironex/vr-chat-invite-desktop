/**
 * Invite History Service
 * Manages persistent storage of invite history with 30-day retention
 */

import Store from "electron-store";
import { debugLog } from "../debug-mode";
import type {
  InviteResultData,
  InviteHistoryEntry,
  InviteHistoryQueryOptions,
  InviteHistoryResponse,
  InviteHistoryStats,
} from "./vrchat-types";

const HISTORY_KEY = "invite-history";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const store = new Store({
  name: "vrchat-history",
});

/**
 * Invite History Service Singleton
 */
class InviteHistoryServiceClass {
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the service - call on app startup
   */
  initialize(): void {
    // Run cleanup immediately
    this.cleanupOldEntries();

    // Set up daily cleanup (every 24 hours)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldEntries();
      },
      24 * 60 * 60 * 1000
    );

    debugLog.info("Invite history service initialized");
  }

  /**
   * Clean up - call on app shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Add a new invite result to history
   */
  addEntry(result: InviteResultData): InviteHistoryEntry {
    const history = this.getAllEntries();

    const entry: InviteHistoryEntry = {
      ...result,
      id: `${result.timestamp}-${result.userId.slice(-8)}`,
    };

    history.push(entry);
    store.set(HISTORY_KEY, history);

    debugLog.info(`History entry added: ${entry.displayName} (${entry.result})`);
    return entry;
  }

  /**
   * Get all history entries (internal use)
   */
  private getAllEntries(): InviteHistoryEntry[] {
    return (store.get(HISTORY_KEY) as InviteHistoryEntry[]) || [];
  }

  /**
   * Get filtered and paginated history
   */
  getHistory(options: InviteHistoryQueryOptions = {}): InviteHistoryResponse {
    const { limit = 50, offset = 0, search, status } = options;

    let entries = this.getAllEntries();

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Filter by status
    if (status) {
      entries = entries.filter((e) => e.result === status);
    }

    // Filter by search term
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.displayName.toLowerCase().includes(searchLower) ||
          e.userId.toLowerCase().includes(searchLower) ||
          e.message.toLowerCase().includes(searchLower)
      );
    }

    const total = entries.length;
    const paginated = entries.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      entries: paginated,
      total,
      hasMore,
    };
  }

  /**
   * Get aggregated statistics
   */
  getStats(): InviteHistoryStats {
    const entries = this.getAllEntries();

    const stats: InviteHistoryStats = {
      total: entries.length,
      successful: entries.filter((e) => e.result === "success").length,
      skipped: entries.filter((e) => e.result === "skipped").length,
      errors: entries.filter((e) => e.result === "error").length,
    };

    // Find most recent invite
    if (entries.length > 0) {
      const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
      stats.lastInviteAt = sorted[0].timestamp;
    }

    return stats;
  }

  /**
   * Generate CSV content from history
   */
  generateCSV(): string {
    const entries = this.getAllEntries();

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // CSV header
    const lines: string[] = ["Timestamp,User ID,Display Name,Status,Message"];

    // Add each entry
    for (const entry of entries) {
      const timestamp = new Date(entry.timestamp).toISOString();
      // Escape CSV values
      const displayName = `"${entry.displayName.replace(/"/g, '""')}"`;
      const message = `"${entry.message.replace(/"/g, '""')}"`;
      lines.push(`${timestamp},${entry.userId},${displayName},${entry.result},${message}`);
    }

    return lines.join("\n");
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    store.delete(HISTORY_KEY);
    debugLog.info("Invite history cleared");
  }

  /**
   * Remove entries older than 30 days
   */
  cleanupOldEntries(): number {
    const entries = this.getAllEntries();
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    const filtered = entries.filter((e) => e.timestamp >= cutoff);
    const removed = entries.length - filtered.length;

    if (removed > 0) {
      store.set(HISTORY_KEY, filtered);
      debugLog.info(`Cleaned up ${removed} old history entries (older than 30 days)`);
    }

    return removed;
  }
}

export const InviteHistoryService = new InviteHistoryServiceClass();
