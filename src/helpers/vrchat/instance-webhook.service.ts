/**
 * Instance Webhook Service
 * Sends Discord notifications for instance events (join/leave/world change)
 * Separate from the inviter webhook - has its own dedicated webhook URL
 */

import { debugLog } from "../debug-mode";
import { SettingsService } from "./settings.service";
import type { InstanceEvent, InstanceWebhookSettings } from "./vrchat-types";

// Webhook translations for EN/PL
const WEBHOOK_TRANSLATIONS = {
  en: {
    playerJoined: "Joined the instance",
    playerJoinedDesc: "**{{displayName}}**\nWorld: **{{worldName}}**",
    playerLeft: "Left the instance",
    playerLeftDesc: "**{{displayName}}**\nWorld: **{{worldName}}**",
    worldChanged: "World Changed",
    worldChangedDesc: "Entered world: **{{worldName}}**",
    noWorld: "Unknown",
  },
  pl: {
    playerJoined: "Dołączył do instancji",
    playerJoinedDesc: "**{{displayName}}**\nŚwiat: **{{worldName}}**",
    playerLeft: "Opuścił instancję",
    playerLeftDesc: "**{{displayName}}**\nŚwiat: **{{worldName}}**",
    worldChanged: "Zmiana świata",
    worldChangedDesc: "Wejście do świata: **{{worldName}}**",
    noWorld: "Nieznany",
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
  timestamp?: string;
}

interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

// Embed colors
const COLORS = {
  join: 0x3fb950, // green
  leave: 0xf85149, // red
  world: 0x58a6ff, // blue
} as const;

// Batch configuration
const BATCH_CONFIG = {
  BATCH_DELAY: 3, // seconds before sending
  MAX_BATCH_SIZE: 10, // max embeds per message
} as const;

interface QueuedEmbed {
  embed: DiscordEmbed;
  timestamp: number;
}

class InstanceWebhookServiceClass {
  private settings: InstanceWebhookSettings = {
    enabled: false,
    webhookUrl: "",
  };

  private queue: QueuedEmbed[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

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
  private interpolate(
    template: string,
    vars: Record<string, string | number>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
  }

  /**
   * Update webhook settings
   */
  updateSettings(settings: InstanceWebhookSettings): void {
    this.settings = { ...settings };
    debugLog.info(
      `[Instance Webhook] Settings updated: enabled=${this.settings.enabled}`
    );
  }

  /**
   * Get current settings
   */
  getSettings(): InstanceWebhookSettings {
    return { ...this.settings };
  }

  /**
   * Check if webhook is configured and enabled
   */
  private isConfigured(): boolean {
    if (!this.settings.enabled) {
      return false;
    }
    const url = this.settings.webhookUrl;
    return url !== "" && url.startsWith("https://discord.com/api/webhooks/");
  }

  /**
   * Send an instance event to Discord
   */
  sendEvent(event: InstanceEvent): void {
    if (!this.isConfigured()) {
      debugLog.debug("[Instance Webhook] Not configured, skipping");
      return;
    }

    const embed = this.buildEmbed(event);
    if (!embed) return;

    this.queueEmbed(embed);
  }

  /**
   * Build Discord embed from event
   */
  private buildEmbed(event: InstanceEvent): DiscordEmbed | null {
    const t = this.getTranslations();

    switch (event.type) {
      case "player_join": {
        const embed: DiscordEmbed = {
          title: `🟢 ${t.playerJoined}`,
          description: this.interpolate(t.playerJoinedDesc, {
            displayName: event.displayName || "Unknown",
            worldName: event.worldName || t.noWorld,
          }),
          color: COLORS.join,
          timestamp: new Date(event.timestamp).toISOString(),
        };
        return embed;
      }

      case "player_leave": {
        const embed: DiscordEmbed = {
          title: `🔴 ${t.playerLeft}`,
          description: this.interpolate(t.playerLeftDesc, {
            displayName: event.displayName || "Unknown",
            worldName: event.worldName || t.noWorld,
          }),
          color: COLORS.leave,
          timestamp: new Date(event.timestamp).toISOString(),
        };
        return embed;
      }

      case "world_enter": {
        const embed: DiscordEmbed = {
          title: `🌍 ${t.worldChanged}`,
          description: this.interpolate(t.worldChangedDesc, {
            worldName: event.worldName || t.noWorld,
          }),
          color: COLORS.world,
          timestamp: new Date(event.timestamp).toISOString(),
        };
        return embed;
      }

      default:
        return null;
    }
  }

  /**
   * Queue an embed for batched sending
   */
  private queueEmbed(embed: DiscordEmbed): void {
    this.queue.push({
      embed,
      timestamp: Date.now(),
    });

    debugLog.debug(
      `[Instance Webhook] Queued embed, queue size: ${this.queue.length}`
    );

    // Start batch timer if not already running
    if (!this.batchTimer && !this.isProcessing) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, BATCH_CONFIG.BATCH_DELAY * 1000);
    }
  }

  /**
   * Process queued embeds in batches
   */
  private async processBatch(): Promise<void> {
    this.batchTimer = null;
    this.isProcessing = true;

    try {
      // Take up to MAX_BATCH_SIZE embeds
      const embeds: DiscordEmbed[] = [];
      while (this.queue.length > 0 && embeds.length < BATCH_CONFIG.MAX_BATCH_SIZE) {
        const item = this.queue.shift()!;
        embeds.push(item.embed);
      }

      if (embeds.length > 0) {
        await this.sendToDiscord(embeds);
      }
    } catch (error) {
      debugLog.error(`[Instance Webhook] Batch processing error: ${error}`);
    } finally {
      this.isProcessing = false;

      // If there are more items in queue, schedule another batch
      if (this.queue.length > 0) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, BATCH_CONFIG.BATCH_DELAY * 1000);
      }
    }
  }

  /**
   * Send embeds to Discord
   */
  private async sendToDiscord(embeds: DiscordEmbed[]): Promise<void> {
    const url = this.settings.webhookUrl;
    if (!url) return;

    const payload: DiscordWebhookPayload = {
      username: "VRChat Instance Monitor",
      embeds: embeds.slice(0, 10), // Discord limit is 10 embeds per message
    };

    try {
      debugLog.network(
        `[Instance Webhook] Sending ${embeds.length} embeds to Discord`
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLog.error(
          `[Instance Webhook] Discord error: ${response.status} - ${errorText}`
        );
      } else {
        debugLog.success(
          `[Instance Webhook] Sent ${embeds.length} embeds to Discord`
        );
      }
    } catch (error) {
      debugLog.error(`[Instance Webhook] Failed to send: ${error}`);
    }
  }

  /**
   * Force flush all pending embeds
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
export const InstanceWebhookService = new InstanceWebhookServiceClass();
