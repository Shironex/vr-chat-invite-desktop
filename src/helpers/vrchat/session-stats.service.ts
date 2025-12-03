/**
 * Session Statistics Service
 * Tracks monitoring sessions with unique players, time buckets, and peak times
 */

import Store from "electron-store";
import { debugLog } from "../debug-mode";
import type {
  DetectedPlayer,
  InviteResultData,
  SessionData,
  SessionStatsQueryOptions,
  SessionStatsResponse,
  PeakHourData,
} from "./vrchat-types";

const SESSIONS_KEY = "sessions";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BUCKET_SIZE_MS = 15 * 60 * 1000; // 15 minutes

const store = new Store({
  name: "vrchat-session-stats",
});

/**
 * Get the bucket start time for a given timestamp
 */
function getBucketKey(timestamp: number): number {
  return Math.floor(timestamp / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
}

/**
 * Session Statistics Service Singleton
 */
class SessionStatsServiceClass {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentSession: SessionData | null = null;
  private uniquePlayerSet: Set<string> = new Set();

  /**
   * Initialize the service - call on app startup
   */
  initialize(): void {
    // Check for any orphaned active sessions (app crashed while monitoring)
    this.cleanupOrphanedSessions();

    // Run cleanup immediately
    this.cleanupOldSessions();

    // Set up daily cleanup (every 24 hours)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldSessions();
      },
      24 * 60 * 60 * 1000
    );

    debugLog.info("Session stats service initialized");
  }

  /**
   * Clean up - call on app shutdown
   */
  shutdown(): void {
    // End any active session
    if (this.currentSession) {
      this.endSession();
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Start a new monitoring session
   */
  startSession(): string {
    const now = Date.now();
    const sessionId = `session-${now}`;

    this.currentSession = {
      id: sessionId,
      startTime: now,
      isActive: true,
      uniquePlayerIds: [],
      totalPlayersDetected: 0,
      totalInvitesSent: 0,
      totalInvitesSkipped: 0,
      totalInvitesError: 0,
      timeBuckets: [],
    };

    this.uniquePlayerSet = new Set();

    debugLog.info(`Session started: ${sessionId}`);
    return sessionId;
  }

  /**
   * End the current monitoring session
   */
  endSession(): void {
    if (!this.currentSession) {
      debugLog.info("No active session to end");
      return;
    }

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.isActive = false;

    // Save to persistent storage
    const sessions = this.getAllSessions();
    sessions.push(this.currentSession);
    store.set(SESSIONS_KEY, sessions);

    debugLog.info(
      `Session ended: ${this.currentSession.id}, ` +
        `unique players: ${this.currentSession.uniquePlayerIds.length}, ` +
        `duration: ${Math.round((now - this.currentSession.startTime) / 1000 / 60)}min`
    );

    this.currentSession = null;
    this.uniquePlayerSet = new Set();
  }

  /**
   * Record a player detection event
   */
  recordPlayerDetected(player: DetectedPlayer): void {
    if (!this.currentSession) {
      return;
    }

    const now = player.timestamp || Date.now();

    // Track unique players
    if (!this.uniquePlayerSet.has(player.userId)) {
      this.uniquePlayerSet.add(player.userId);
      this.currentSession.uniquePlayerIds.push(player.userId);
    }

    this.currentSession.totalPlayersDetected++;

    // Update time bucket
    const bucketKey = getBucketKey(now);
    let bucket = this.currentSession.timeBuckets.find((b) => b.startTime === bucketKey);

    if (!bucket) {
      bucket = {
        startTime: bucketKey,
        playerCount: 0,
        invitesSent: 0,
        invitesSkipped: 0,
        invitesError: 0,
      };
      this.currentSession.timeBuckets.push(bucket);
      // Keep buckets sorted by time
      this.currentSession.timeBuckets.sort((a, b) => a.startTime - b.startTime);
    }

    bucket.playerCount++;
  }

  /**
   * Record an invite result
   */
  recordInviteResult(result: InviteResultData): void {
    if (!this.currentSession) {
      return;
    }

    const now = result.timestamp || Date.now();

    // Update totals
    switch (result.result) {
      case "success":
        this.currentSession.totalInvitesSent++;
        break;
      case "skipped":
        this.currentSession.totalInvitesSkipped++;
        break;
      case "error":
        this.currentSession.totalInvitesError++;
        break;
    }

    // Update time bucket
    const bucketKey = getBucketKey(now);
    let bucket = this.currentSession.timeBuckets.find((b) => b.startTime === bucketKey);

    if (!bucket) {
      bucket = {
        startTime: bucketKey,
        playerCount: 0,
        invitesSent: 0,
        invitesSkipped: 0,
        invitesError: 0,
      };
      this.currentSession.timeBuckets.push(bucket);
      this.currentSession.timeBuckets.sort((a, b) => a.startTime - b.startTime);
    }

    switch (result.result) {
      case "success":
        bucket.invitesSent++;
        break;
      case "skipped":
        bucket.invitesSkipped++;
        break;
      case "error":
        bucket.invitesError++;
        break;
    }
  }

  /**
   * Get the current active session
   */
  getActiveSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Get all stored sessions (internal use)
   */
  private getAllSessions(): SessionData[] {
    return (store.get(SESSIONS_KEY) as SessionData[]) || [];
  }

  /**
   * Get sessions with query options
   */
  getSessions(options: SessionStatsQueryOptions = {}): SessionStatsResponse {
    const { limit = 20, includeActive = true } = options;

    let sessions = this.getAllSessions();

    // Sort by startTime descending (newest first)
    sessions.sort((a, b) => b.startTime - a.startTime);

    // Apply limit
    if (limit > 0) {
      sessions = sessions.slice(0, limit);
    }

    // Calculate peak hours across all sessions
    const peakHours = this.calculatePeakHours(sessions);

    const response: SessionStatsResponse = {
      sessions,
      peakHours,
    };

    // Include active session if requested
    if (includeActive && this.currentSession) {
      response.activeSession = this.currentSession;
    }

    return response;
  }

  /**
   * Calculate peak hours from session data
   */
  private calculatePeakHours(sessions: SessionData[]): PeakHourData[] {
    const hourlyTotals: { [hour: number]: { total: number; count: number } } = {};

    // Initialize all hours
    for (let h = 0; h < 24; h++) {
      hourlyTotals[h] = { total: 0, count: 0 };
    }

    // Aggregate player counts by hour
    for (const session of sessions) {
      for (const bucket of session.timeBuckets) {
        const date = new Date(bucket.startTime);
        const hour = date.getHours();
        hourlyTotals[hour].total += bucket.playerCount;
        hourlyTotals[hour].count++;
      }
    }

    // Also include active session
    if (this.currentSession) {
      for (const bucket of this.currentSession.timeBuckets) {
        const date = new Date(bucket.startTime);
        const hour = date.getHours();
        hourlyTotals[hour].total += bucket.playerCount;
        hourlyTotals[hour].count++;
      }
    }

    // Calculate averages
    const peakHours: PeakHourData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyTotals[hour];
      peakHours.push({
        hour,
        avgPlayers: data.count > 0 ? Math.round(data.total / data.count) : 0,
      });
    }

    return peakHours;
  }

  /**
   * Clear all session statistics
   */
  clearSessions(): void {
    store.delete(SESSIONS_KEY);
    debugLog.info("Session statistics cleared");
  }

  /**
   * Remove sessions older than 30 days
   */
  cleanupOldSessions(): number {
    const sessions = this.getAllSessions();
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    const filtered = sessions.filter((s) => s.startTime >= cutoff);
    const removed = sessions.length - filtered.length;

    if (removed > 0) {
      store.set(SESSIONS_KEY, filtered);
      debugLog.info(`Cleaned up ${removed} old sessions (older than 30 days)`);
    }

    return removed;
  }

  /**
   * Clean up any sessions that were marked active but app crashed
   */
  private cleanupOrphanedSessions(): void {
    const sessions = this.getAllSessions();
    let hasOrphans = false;

    for (const session of sessions) {
      if (session.isActive) {
        // This session was left active from a crash - close it
        session.isActive = false;
        session.endTime = session.endTime || session.startTime + 1; // Give it minimal duration
        hasOrphans = true;
        debugLog.info(`Cleaned up orphaned session: ${session.id}`);
      }
    }

    if (hasOrphans) {
      store.set(SESSIONS_KEY, sessions);
    }
  }
}

export const SessionStatsService = new SessionStatsServiceClass();
