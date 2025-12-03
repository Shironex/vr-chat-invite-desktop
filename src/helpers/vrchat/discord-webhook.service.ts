/**
 * Discord Webhook Service
 * Sends notifications to Discord via webhooks with batching support
 */

import { DISCORD_WEBHOOKS, VRCHAT_GROUP } from "../../config/vrchat.config";
import { debugLog } from "../debug-mode";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

type WebhookType = "success" | "warning" | "error";

interface QueuedNotification {
  type: WebhookType;
  embed: DiscordEmbed;
  timestamp: number;
}

// Embed colors
const COLORS = {
  success: 0x3fb950, // green
  warning: 0xd29922, // yellow
  error: 0xf85149, // red
} as const;

class DiscordWebhookService {
  private queue: QueuedNotification[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Check if webhooks are configured
   */
  private isConfigured(type: WebhookType): boolean {
    const url = this.getWebhookUrl(type);
    return url !== null && url.startsWith("https://discord.com/api/webhooks/");
  }

  /**
   * Get webhook URL by type
   */
  private getWebhookUrl(type: WebhookType): string | null {
    switch (type) {
      case "success":
        return DISCORD_WEBHOOKS.SUCCESS || null;
      case "warning":
        return DISCORD_WEBHOOKS.WARNING || null;
      case "error":
        return DISCORD_WEBHOOKS.ERROR || null;
      default:
        return null;
    }
  }

  /**
   * Send invite success notification
   */
  sendInviteSuccess(userId: string, displayName: string): void {
    if (!this.isConfigured("success")) {
      debugLog.debug("Discord success webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "✅ Zaproszenie wysłane",
      description: `Gracz **${displayName}** został zaproszony do grupy **${VRCHAT_GROUP.GROUP_NAME}**`,
      color: COLORS.success,
      fields: [
        {
          name: "User ID",
          value: `\`${userId}\``,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("success", embed);
  }

  /**
   * Send skip notification (already member, etc.)
   */
  sendSkipped(userId: string, displayName: string, reason: string): void {
    if (!this.isConfigured("warning")) {
      debugLog.debug("Discord warning webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "⏭️ Pominięto gracza",
      description: `Gracz **${displayName}** został pominięty`,
      color: COLORS.warning,
      fields: [
        {
          name: "Powód",
          value: reason,
          inline: true,
        },
        {
          name: "User ID",
          value: `\`${userId}\``,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("warning", embed);
  }

  /**
   * Send rate limit warning
   */
  sendRateLimitWarning(pauseDuration: number): void {
    if (!this.isConfigured("warning")) {
      debugLog.debug("Discord warning webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "⚠️ Limit zapytań",
      description: `Kolejka wstrzymana na **${Math.round(pauseDuration / 60)} minut** z powodu limitu zapytań`,
      color: COLORS.warning,
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("warning", embed);
  }

  /**
   * Send error notification
   */
  sendError(message: string, details?: string): void {
    if (!this.isConfigured("error")) {
      debugLog.debug("Discord error webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "❌ Błąd",
      description: message,
      color: COLORS.error,
      fields: details
        ? [
            {
              name: "Szczegóły",
              value: `\`\`\`${details.substring(0, 1000)}\`\`\``,
              inline: false,
            },
          ]
        : undefined,
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("error", embed);
  }

  /**
   * Send auth notification
   */
  sendAuthSuccess(displayName: string): void {
    if (!this.isConfigured("success")) {
      debugLog.debug("Discord success webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "🔐 Zalogowano",
      description: `Pomyślnie zalogowano jako **${displayName}**`,
      color: COLORS.success,
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("success", embed);
  }

  /**
   * Send monitor started notification
   */
  sendMonitorStarted(): void {
    if (!this.isConfigured("success")) {
      debugLog.debug("Discord success webhook not configured, skipping");
      return;
    }

    const embed: DiscordEmbed = {
      title: "👁️ Monitorowanie rozpoczęte",
      description: `Rozpoczęto monitorowanie logów VRChat dla grupy **${VRCHAT_GROUP.GROUP_NAME}**`,
      color: COLORS.success,
      timestamp: new Date().toISOString(),
    };

    this.queueNotification("success", embed);
  }

  /**
   * Queue a notification for batched sending
   */
  private queueNotification(type: WebhookType, embed: DiscordEmbed): void {
    this.queue.push({
      type,
      embed,
      timestamp: Date.now(),
    });

    debugLog.debug(`Queued Discord notification (${type}), queue size: ${this.queue.length}`);

    // Start batch timer if not already running
    if (!this.batchTimer && !this.isProcessing) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, DISCORD_WEBHOOKS.BATCH_DELAY * 1000);
    }
  }

  /**
   * Process queued notifications in batches
   */
  private async processBatch(): Promise<void> {
    this.batchTimer = null;
    this.isProcessing = true;

    try {
      // Group by webhook type
      const grouped: Record<WebhookType, DiscordEmbed[]> = {
        success: [],
        warning: [],
        error: [],
      };

      // Take up to MAX_BATCH_SIZE per type
      while (this.queue.length > 0) {
        const notification = this.queue.shift()!;
        if (grouped[notification.type].length < DISCORD_WEBHOOKS.MAX_BATCH_SIZE) {
          grouped[notification.type].push(notification.embed);
        } else {
          // Put back if batch is full
          this.queue.unshift(notification);
          break;
        }
      }

      // Send batches
      const sendPromises: Promise<void>[] = [];

      for (const type of ["success", "warning", "error"] as WebhookType[]) {
        if (grouped[type].length > 0) {
          sendPromises.push(this.sendBatch(type, grouped[type]));
        }
      }

      await Promise.all(sendPromises);
    } catch (error) {
      debugLog.error(`Discord batch processing error: ${error}`);
    } finally {
      this.isProcessing = false;

      // If there are more items in queue, schedule another batch
      if (this.queue.length > 0) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, DISCORD_WEBHOOKS.BATCH_DELAY * 1000);
      }
    }
  }

  /**
   * Send a batch of embeds to a webhook
   */
  private async sendBatch(type: WebhookType, embeds: DiscordEmbed[]): Promise<void> {
    const url = this.getWebhookUrl(type);
    if (!url) return;

    const payload: DiscordWebhookPayload = {
      username: "VRChat Group Inviter",
      embeds: embeds.slice(0, 10), // Discord limit is 10 embeds per message
    };

    try {
      debugLog.network(`Sending ${embeds.length} embeds to Discord (${type})`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLog.error(`Discord webhook error (${type}): ${response.status} - ${errorText}`);
      } else {
        debugLog.success(`Discord webhook sent (${type}): ${embeds.length} embeds`);
      }
    } catch (error) {
      debugLog.error(`Discord webhook failed (${type}): ${error}`);
    }
  }

  /**
   * Force flush all pending notifications
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

// Export singleton instance
export const discordWebhook = new DiscordWebhookService();
