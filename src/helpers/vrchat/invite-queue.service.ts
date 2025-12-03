/**
 * Invite Queue Service
 * Manages the queue of players to invite and processes them with rate limiting
 * Adapted from Python: C:\Users\shirone\Downloads\Inv\Inv\vrchat-group-inviter\src\inviter\invite_queue.py
 */

import { debugLog } from "../debug-mode";
import { VRChatApiService } from "./vrchat-api.service";
import { SettingsService } from "./settings.service";
import { discordWebhook } from "./discord-webhook.service";
import type {
  InviteRequest,
  InviteResultData,
  InviterStats,
} from "./vrchat-types";

// Callback types
type OnInviteResultCallback = (result: InviteResultData) => void;
type OnStatsUpdateCallback = (stats: InviterStats) => void;
type OnQueueUpdateCallback = (queue: InviteRequest[]) => void;
type OnLogCallback = (
  type: string,
  message: string,
  userId?: string,
  displayName?: string,
  i18nKey?: string,
  i18nParams?: Record<string, string | number>
) => void;

/**
 * Invite Queue Service Singleton
 */
class InviteQueueServiceClass {
  private queue: InviteRequest[] = [];
  private invitedCache: Set<string> = new Set();
  private isProcessing = false;
  private shouldStop = false;
  private processingPromise: Promise<void> | null = null;

  // Statistics
  private stats: InviterStats = {
    totalProcessed: 0,
    successful: 0,
    skipped: 0,
    errors: 0,
    queueSize: 0,
  };

  // Callbacks
  private onInviteResult: OnInviteResultCallback | null = null;
  private onStatsUpdate: OnStatsUpdateCallback | null = null;
  private onQueueUpdate: OnQueueUpdateCallback | null = null;
  private onLog: OnLogCallback | null = null;

  /**
   * Set callbacks for events
   */
  setCallbacks(callbacks: {
    onInviteResult?: OnInviteResultCallback;
    onStatsUpdate?: OnStatsUpdateCallback;
    onQueueUpdate?: OnQueueUpdateCallback;
    onLog?: OnLogCallback;
  }): void {
    if (callbacks.onInviteResult) this.onInviteResult = callbacks.onInviteResult;
    if (callbacks.onStatsUpdate) this.onStatsUpdate = callbacks.onStatsUpdate;
    if (callbacks.onQueueUpdate) this.onQueueUpdate = callbacks.onQueueUpdate;
    if (callbacks.onLog) this.onLog = callbacks.onLog;
  }

  /**
   * Add a user to the invite queue
   */
  add(userId: string, displayName: string): boolean {
    // Check if already in cache (already invited or pending)
    if (this.invitedCache.has(userId)) {
      debugLog.info(`User ${displayName} already in queue/invited`);
      return false;
    }

    // Add to queue and cache
    const request: InviteRequest = {
      userId,
      displayName,
      timestamp: Date.now(),
    };

    this.queue.push(request);
    this.invitedCache.add(userId);
    this.stats.queueSize = this.queue.length;

    debugLog.info(`Added to queue: ${displayName} (${userId})`);
    this.emitLog("queue", `Added to queue: ${displayName}`, userId, displayName, "logAddedToQueue", { name: displayName });
    this.emitQueueUpdate();
    this.emitStatsUpdate();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return true;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.stats.queueSize = 0;
    debugLog.info("Queue cleared");
    this.emitQueueUpdate();
    this.emitStatsUpdate();
  }

  /**
   * Get queue items
   */
  getQueue(): InviteRequest[] {
    return [...this.queue];
  }

  /**
   * Get statistics
   */
  getStats(): InviterStats {
    return { ...this.stats, queueSize: this.queue.length };
  }

  /**
   * Check if user is already invited/queued
   */
  isInvited(userId: string): boolean {
    return this.invitedCache.has(userId);
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.shouldStop = false;
    this.processingPromise = this.processLoop();
  }

  /**
   * Stop processing the queue
   */
  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) return;

    this.shouldStop = true;
    if (this.processingPromise) {
      await this.processingPromise;
    }
    this.isProcessing = false;
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    debugLog.info("Invite worker started");
    let invitesInBatch = 0;

    while (!this.shouldStop) {
      // Check if queue is empty
      if (this.queue.length === 0) {
        // Wait a bit and check again
        await this.sleep(1000);
        if (this.queue.length === 0) {
          // Still empty, stop processing
          break;
        }
        continue;
      }

      const settings = SettingsService.getSettings();

      // Check queue threshold
      if (this.queue.length >= settings.queueThreshold) {
        debugLog.warn(
          `Queue threshold reached (${this.queue.length} >= ${settings.queueThreshold}), pausing for ${settings.queuePauseDelay}s`
        );
        this.emitLog(
          "rate",
          `Queue threshold reached! Pausing for ${Math.floor(settings.queuePauseDelay / 60)} minutes...`,
          undefined,
          undefined,
          "logQueueThreshold",
          { minutes: Math.floor(settings.queuePauseDelay / 60) }
        );
        discordWebhook.sendRateLimitWarning(settings.queuePauseDelay);
        await this.sleep(settings.queuePauseDelay * 1000);
        continue;
      }

      // Get next item from queue
      const request = this.queue.shift();
      if (!request) continue;

      this.stats.queueSize = this.queue.length;
      this.emitQueueUpdate();
      this.emitStatsUpdate();

      // Process the invite
      const result = await this.processInvite(request);

      // Update stats
      this.stats.totalProcessed++;
      if (result.result === "success") {
        this.stats.successful++;
        invitesInBatch++;
      } else if (result.result === "skipped") {
        this.stats.skipped++;
      } else {
        this.stats.errors++;
      }
      this.emitStatsUpdate();

      // Emit result
      if (this.onInviteResult) {
        this.onInviteResult(result);
      }

      // Rate limiting
      if (result.result === "success") {
        // Check batch limit
        if (invitesInBatch >= settings.inviteBatchCount) {
          debugLog.info(
            `Batch limit reached (${invitesInBatch}), pausing for ${settings.inviteBatchDelay}s`
          );
          this.emitLog(
            "rate",
            `Batch limit reached, pausing ${settings.inviteBatchDelay}s...`,
            undefined,
            undefined,
            "logBatchLimit",
            { seconds: settings.inviteBatchDelay }
          );
          await this.sleep(settings.inviteBatchDelay * 1000);
          invitesInBatch = 0;
        } else {
          // Delay between invites
          await this.sleep(settings.inviteDelayBetween * 1000);
        }
      } else {
        // Minimum delay for non-success
        await this.sleep(500);
      }
    }

    this.isProcessing = false;
    debugLog.info("Invite worker stopped");
  }

  /**
   * Process a single invite
   */
  private async processInvite(request: InviteRequest): Promise<InviteResultData> {
    const { userId, displayName } = request;

    debugLog.info(`Processing invite for ${displayName} (${userId})`);

    try {
      const response = await VRChatApiService.sendGroupInvite(userId);

      if (response.success) {
        debugLog.success(`Invited ${displayName}`);
        this.emitLog("invite", `Invited ${displayName}`, userId, displayName, "logInviteSent", { name: displayName });
        discordWebhook.sendInviteSuccess(userId, displayName);

        return {
          result: "success",
          userId,
          displayName,
          message: "Invite sent successfully",
          timestamp: Date.now(),
        };
      }

      if (response.skipped) {
        debugLog.info(`Skipped ${displayName}: ${response.message}`);
        // Use specific translation key for "already invited or member"
        const isAlreadyMember = response.message.toLowerCase().includes("already");
        this.emitLog(
          "skip",
          `Skipped ${displayName}: ${response.message}`,
          userId,
          displayName,
          isAlreadyMember ? "logSkippedAlreadyMember" : "logSkipped",
          isAlreadyMember ? { name: displayName } : { name: displayName, reason: response.message }
        );
        discordWebhook.sendSkipped(userId, displayName, response.message);

        return {
          result: "skipped",
          userId,
          displayName,
          message: response.message,
          timestamp: Date.now(),
        };
      }

      debugLog.error(`Failed to invite ${displayName}: ${response.message}`);
      this.emitLog("error", `Error inviting ${displayName}: ${response.message}`, userId, displayName, "logInviteError", { name: displayName, error: response.message });
      discordWebhook.sendError(`Nie udało się zaprosić ${displayName}`, response.message);

      return {
        result: "error",
        userId,
        displayName,
        message: response.message,
        timestamp: Date.now(),
      };
    } catch (error) {
      const message = String(error);
      debugLog.error(`Exception inviting ${displayName}: ${message}`);
      this.emitLog("error", `Error: ${message}`, userId, displayName, "logError", { error: message });
      discordWebhook.sendError(`Błąd podczas zapraszania ${displayName}`, message);

      return {
        result: "error",
        userId,
        displayName,
        message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Emit stats update
   */
  private emitStatsUpdate(): void {
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  /**
   * Emit queue update
   */
  private emitQueueUpdate(): void {
    if (this.onQueueUpdate) {
      this.onQueueUpdate(this.getQueue());
    }
  }

  /**
   * Emit log
   */
  private emitLog(
    type: string,
    message: string,
    userId?: string,
    displayName?: string,
    i18nKey?: string,
    i18nParams?: Record<string, string | number>
  ): void {
    if (this.onLog) {
      this.onLog(type, message, userId, displayName, i18nKey, i18nParams);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      skipped: 0,
      errors: 0,
      queueSize: this.queue.length,
    };
    this.emitStatsUpdate();
  }

  /**
   * Check if processing
   */
  isWorkerRunning(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export const InviteQueueService = new InviteQueueServiceClass();
