/**
 * Instance Settings
 * Webhook URL configuration for instance monitoring
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Webhook, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/utils/tailwind";

interface InstanceSettingsProps {
  className?: string;
}

export function InstanceSettings({ className }: InstanceSettingsProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    webhookUrl: "",
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await window.instanceMonitorAPI.getWebhookSettings();
        setSettings(loaded);
      } catch (error) {
        console.error("Failed to load instance webhook settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle enable toggle
  const handleEnableToggle = async (checked: boolean) => {
    const updated = { ...settings, enabled: checked };
    setSettings(updated);
    try {
      await window.instanceMonitorAPI.setWebhookSettings({ enabled: checked });
    } catch (error) {
      toast.error(t("instanceWebhookSaveFailed", { error: String(error) }));
    }
  };

  // Handle URL change (save on blur)
  const handleUrlBlur = async () => {
    try {
      await window.instanceMonitorAPI.setWebhookSettings({ webhookUrl: settings.webhookUrl });
    } catch (error) {
      toast.error(t("instanceWebhookSaveFailed", { error: String(error) }));
    }
  };

  // Handle reset
  const handleReset = async () => {
    try {
      const defaults = await window.instanceMonitorAPI.resetWebhookSettings();
      setSettings(defaults);
      toast.success(t("instanceWebhookReset"));
    } catch (error) {
      toast.error(t("instanceWebhookResetFailed", { error: String(error) }));
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span className="text-sm font-medium">{t("instanceWebhookTitle")}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-3 pb-3">
        <p className="text-muted-foreground text-xs">
          {t("instanceWebhookDescription")}
        </p>

        {/* Enable Webhooks Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">{t("instanceWebhookEnable")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("instanceWebhookEnableHint")}
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleEnableToggle}
          />
        </div>

        {/* Webhook URL (only shown when enabled) */}
        {settings.enabled && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm">{t("instanceWebhookUrl")}</Label>
            <Input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.webhookUrl}
              onChange={(e) => {
                setSettings((s) => ({ ...s, webhookUrl: e.target.value }));
              }}
              onBlur={handleUrlBlur}
            />
            <p className="text-muted-foreground text-xs">
              {t("instanceWebhookUrlHint")}
            </p>

            {/* Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="mt-2"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              {t("instanceWebhookResetDefaults")}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
