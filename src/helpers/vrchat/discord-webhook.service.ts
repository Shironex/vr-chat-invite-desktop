/**
 * Discord Webhook Service
 * Sends notifications to Discord via webhooks with batching support
 * User-configurable webhook URLs stored in settings
 */

import { DISCORD_WEBHOOKS, VRCHAT_GROUP } from "../../config/vrchat.config";
import { debugLog } from "../debug-mode";
import { SettingsService } from "./settings.service";
import type { WebhookSettings } from "./vrchat-types";

// Webhook translations for EN/PL
const WEBHOOK_TRANSLATIONS = {
  en: {
    inviteSuccess: "Invite sent",
    inviteSuccessDesc: "Player **{{displayName}}** was invited to group **{{groupName}}**",
    skipped: "Player skipped",
    skippedDesc: "Player **{{displayName}}** was skipped",
    reason: "Reason",
    rateLimit: "Rate limit",
    rateLimitDesc: "Queue paused for **{{minutes}} minutes** due to rate limiting",
    error: "Error",
    details: "Details",
    authSuccess: "Logged in",
    authSuccessDesc: "Successfully logged in as **{{displayName}}**",
    monitorStarted: "Monitoring started",
    monitorStartedDesc: "Started monitoring VRChat logs for group **{{groupName}}**",
    userId: "User ID",
    sentBy: "Sent by",
  },
  pl: {
    inviteSuccess: "Zaproszenie wysłane",
    inviteSuccessDesc: "Gracz **{{displayName}}** został zaproszony do grupy **{{groupName}}**",
    skipped: "Pominięto gracza",
    skippedDesc: "Gracz **{{displayName}}** został pominięty",
    reason: "Powód",
    rateLimit: "Limit zapytań",
    rateLimitDesc: "Kolejka wstrzymana na **{{minutes}} minut** z powodu limitu zapytań",
    error: "Błąd",
    details: "Szczegóły",
    authSuccess: "Zalogowano",
    authSuccessDesc: "Pomyślnie zalogowano jako **{{displayName}}**",
    monitorStarted: "Monitorowanie rozpoczęte",
    monitorStartedDesc: "Rozpoczęto monitorowanie logów VRChat dla grupy **{{groupName}}**",
    userId: "User ID",
    sentBy: "Wysłane przez",
  },
} as const;

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

  // Current operator (logged-in VRChat user) for footer attribution
  private operatorName: string | null = null;

  // User-configurable webhook settings (defaults to disabled)
  private settings: WebhookSettings = {
    enabled: false,
    successUrl: "",
    warningUrl: "",
    errorUrl: "",
  };

  /**
   * Get translation strings based on current language setting
   */
  private getTranslations() {
    const lang = SettingsService.getLanguage();
    return WEBHOOK_TRANSLATIONS[lang];
  }

  /**
   * Replace template variables in a string
   */
  private interpolate(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
  }

  /**
   * Update webhook settings from user configuration
   */
  updateSettings(newSettings: WebhookSettings): void {
    this.settings = { ...newSettings };
    debugLog.info(`Discord webhook settings updated: enabled=${this.settings.enabled}`);
  }

  /**
   * Set the current operator (logged-in user) for footer attribution
   */
  setOperator(displayName: string | null): void {
    this.operatorName = displayName;
    debugLog.info(`Discord webhook operator set: ${displayName ?? "none"}`);
  }

  /**
   * Get operator field for embed attribution (with bold name)
   */
  private getOperatorField(): { name: string; value: string; inline: boolean } | undefined {
    if (!this.operatorName) return undefined;
    const t = this.getTranslations();
    return {
      name: t.sentBy,
      value: `**${this.operatorName}**`,
      inline: true,
    };
  }

  /**
   * Check if webhooks are configured and enabled
   */
  private isConfigured(type: WebhookType): boolean {
    // Must be enabled first
    if (!this.settings.enabled) {
      return false;
    }
    const url = this.getWebhookUrl(type);
    return url !== null && url.startsWith("https://discord.com/api/webhooks/");
  }

  /**
   * Get webhook URL by type (from user settings)
   */
  private getWebhookUrl(type: WebhookType): string | null {
    switch (type) {
      case "success":
        return this.settings.successUrl || null;
      case "warning":
        return this.settings.warningUrl || null;
      case "error":
        return this.settings.errorUrl || null;
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

    const t = this.getTranslations();
    const operatorField = this.getOperatorField();
    const embed: DiscordEmbed = {
      title: `✅ ${t.inviteSuccess}`,
      description: this.interpolate(t.inviteSuccessDesc, {
        displayName,
        groupName: VRCHAT_GROUP.GROUP_NAME,
      }),
      color: COLORS.success,
      fields: [
        {
          name: t.userId,
          value: `\`${userId}\``,
          inline: true,
        },
        ...(operatorField ? [operatorField] : []),
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

    const t = this.getTranslations();
    const operatorField = this.getOperatorField();
    const embed: DiscordEmbed = {
      title: `⏭️ ${t.skipped}`,
      description: this.interpolate(t.skippedDesc, { displayName }),
      color: COLORS.warning,
      fields: [
        {
          name: t.reason,
          value: reason,
          inline: true,
        },
        {
          name: t.userId,
          value: `\`${userId}\``,
          inline: true,
        },
        ...(operatorField ? [operatorField] : []),
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

    const t = this.getTranslations();
    const operatorField = this.getOperatorField();
    const embed: DiscordEmbed = {
      title: `⚠️ ${t.rateLimit}`,
      description: this.interpolate(t.rateLimitDesc, {
        minutes: Math.round(pauseDuration / 60),
      }),
      color: COLORS.warning,
      fields: operatorField ? [operatorField] : undefined,
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

    const t = this.getTranslations();
    const operatorField = this.getOperatorField();
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (details) {
      fields.push({
        name: t.details,
        value: `\`\`\`${details.substring(0, 1000)}\`\`\``,
        inline: false,
      });
    }
    if (operatorField) {
      fields.push(operatorField);
    }

    const embed: DiscordEmbed = {
      title: `❌ ${t.error}`,
      description: message,
      color: COLORS.error,
      fields: fields.length > 0 ? fields : undefined,
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

    const t = this.getTranslations();
    const embed: DiscordEmbed = {
      title: `🔐 ${t.authSuccess}`,
      description: this.interpolate(t.authSuccessDesc, { displayName }),
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

    const t = this.getTranslations();
    const embed: DiscordEmbed = {
      title: `👁️ ${t.monitorStarted}`,
      description: this.interpolate(t.monitorStartedDesc, {
        groupName: VRCHAT_GROUP.GROUP_NAME,
      }),
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
