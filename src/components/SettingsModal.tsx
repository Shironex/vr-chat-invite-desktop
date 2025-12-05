/**
 * Settings Modal
 * Centralized settings management with tabs for all app settings
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Settings,
  Globe,
  Palette,
  Info,
  Loader2,
  Save,
  RotateCcw,
  Gamepad2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderOpen,
  MonitorDown,
  Bell,
  Webhook,
  Users,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import langs from "@/localization/langs";
import { setAppLanguage } from "@/helpers/language_helpers";
import { setTheme, getCurrentTheme } from "@/helpers/theme_helpers";
import type { ThemeMode } from "@/types/theme-mode";
import packageJson from "../../package.json";
import { cn } from "@/utils/tailwind";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface AllSettings {
  // General
  language: "en" | "pl";
  theme: ThemeMode;
  // Application
  vrchatPath: string | null;
  tray: {
    minimizeToTray: boolean;
    showDesktopNotifications: boolean;
  };
  // Inviter
  rateLimit: {
    inviteBatchCount: number;
    inviteBatchDelay: number;
    inviteDelayBetween: number;
    queueThreshold: number;
    queuePauseDelay: number;
  };
  inviterWebhook: {
    enabled: boolean;
    successUrl: string;
    warningUrl: string;
    errorUrl: string;
  };
  // Instance Monitor
  instanceWebhook: {
    enabled: boolean;
    webhookUrl: string;
  };
}

// ─────────────────────────────────────────────────────────────────
// Slider Field Component
// ─────────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  hint: string;
  unit?: string;
  disabled?: boolean;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  unit,
  disabled,
}: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-medium tabular-nums">
          {value}
          {unit && <span className="text-muted-foreground ml-1 text-xs">{unit}</span>}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full"
      />
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function SettingsModal() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isDetectingPath, setIsDetectingPath] = useState(false);

  // All settings state
  const [settings, setSettings] = useState<AllSettings>({
    language: "en",
    theme: "system",
    vrchatPath: null,
    tray: {
      minimizeToTray: true,
      showDesktopNotifications: true,
    },
    rateLimit: {
      inviteBatchCount: 8,
      inviteBatchDelay: 12,
      inviteDelayBetween: 2,
      queueThreshold: 88,
      queuePauseDelay: 600,
    },
    inviterWebhook: {
      enabled: false,
      successUrl: "",
      warningUrl: "",
      errorUrl: "",
    },
    instanceWebhook: {
      enabled: false,
      webhookUrl: "",
    },
  });

  // Load all settings
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rateLimits, vrchatPath, tray, inviterWebhook, instanceWebhook, language] =
        await Promise.all([
          window.vrchatAPI.getSettings(),
          window.vrchatAPI.getVRChatPath(),
          window.trayAPI.getSettings(),
          window.vrchatAPI.getWebhookSettings(),
          window.instanceMonitorAPI.getWebhookSettings(),
          window.vrchatAPI.getLanguage(),
        ]);

      const { local: theme } = await getCurrentTheme();

      setSettings({
        language,
        theme: theme || "system",
        vrchatPath,
        tray,
        rateLimit: rateLimits,
        inviterWebhook: inviterWebhook,
        instanceWebhook: instanceWebhook,
      });
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error(t("settingsLoadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Load settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  // Update a setting and mark as dirty
  const updateSettings = <K extends keyof AllSettings>(
    key: K,
    value: AllSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Save all settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all settings in parallel
      await Promise.all([
        // Language
        window.vrchatAPI.setLanguage(settings.language),
        // Theme (applied immediately via setTheme)
        setTheme(settings.theme),
        // Tray
        window.trayAPI.setSettings(settings.tray),
        // Rate limits
        window.vrchatAPI.setSettings(settings.rateLimit),
        // Inviter webhook
        window.vrchatAPI.setWebhookSettings(settings.inviterWebhook),
        // Instance webhook
        window.instanceMonitorAPI.setWebhookSettings(settings.instanceWebhook),
      ]);

      // Apply language change to UI
      setAppLanguage(settings.language, i18n);

      setIsDirty(false);
      toast.success(t("settingsSaved"));
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(t("settingsSaveFailed", { error: String(error) }));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset all settings to defaults
  const handleResetAll = async () => {
    setIsSaving(true);
    try {
      const [rateLimits, inviterWebhook, instanceWebhook] = await Promise.all([
        window.vrchatAPI.resetSettings(),
        window.vrchatAPI.resetWebhookSettings(),
        window.instanceMonitorAPI.resetWebhookSettings(),
      ]);

      setSettings((prev) => ({
        ...prev,
        rateLimit: rateLimits,
        inviterWebhook: inviterWebhook,
        instanceWebhook: instanceWebhook,
      }));

      setIsDirty(false);
      toast.success(t("settingsResetSuccess"));
    } catch (error) {
      toast.error(t("settingsResetFailed", { error: String(error) }));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle VRChat path detection
  const handleDetectPath = async () => {
    setIsDetectingPath(true);
    try {
      const detected = await window.vrchatAPI.detectVRChatPath();
      if (detected) {
        const success = await window.vrchatAPI.setVRChatPath(detected);
        if (success) {
          updateSettings("vrchatPath", detected);
          toast.success(t("pathDetected"));
        }
      } else {
        toast.error(t("pathNotFound"));
      }
    } catch (error) {
      toast.error(t("pathDetectFailed", { error: String(error) }));
    } finally {
      setIsDetectingPath(false);
    }
  };

  // Handle VRChat path browse
  const handleBrowsePath = async () => {
    try {
      const selected = await window.vrchatAPI.browseVRChatPath();
      if (selected) {
        const success = await window.vrchatAPI.setVRChatPath(selected);
        if (success) {
          updateSettings("vrchatPath", selected);
          toast.success(t("pathSaved"));
        } else {
          toast.error(t("pathInvalid"));
        }
      }
    } catch (error) {
      toast.error(t("pathBrowseFailed", { error: String(error) }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("settings")}>
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("settingsTitle")}</DialogTitle>
          <DialogDescription>{t("settingsDescription")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general" className="gap-1.5">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabGeneral")}</span>
                </TabsTrigger>
                <TabsTrigger value="application" className="gap-1.5">
                  <Gamepad2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabApplication")}</span>
                </TabsTrigger>
                <TabsTrigger value="inviter" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabInviter")}</span>
                </TabsTrigger>
                <TabsTrigger value="instance" className="gap-1.5">
                  <Gauge className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabInstance")}</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* ─────────────────────────────────────────────────────────────────
                    General Tab
                ───────────────────────────────────────────────────────────────── */}
                <TabsContent value="general" className="space-y-6 pr-4">
                  {/* Language Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("languageSection")}</h3>
                    </div>
                    <RadioGroup
                      value={settings.language}
                      onValueChange={(value) => updateSettings("language", value as "en" | "pl")}
                      className="space-y-1.5"
                    >
                      {langs.map((lang) => (
                        <div
                          key={lang.key}
                          className="flex items-center space-x-2 rounded-md border p-2.5 hover:bg-accent/50 transition-colors"
                        >
                          <RadioGroupItem value={lang.key} id={`lang-${lang.key}`} />
                          <Label
                            htmlFor={`lang-${lang.key}`}
                            className="flex-1 cursor-pointer font-normal text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span>{lang.nativeName}</span>
                              <span className="text-xs text-muted-foreground">{lang.prefix}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Theme Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("themeSection")}</h3>
                    </div>
                    <RadioGroup
                      value={settings.theme}
                      onValueChange={(value) => updateSettings("theme", value as ThemeMode)}
                      className="space-y-1.5"
                    >
                      {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                        <div
                          key={mode}
                          className="flex items-center space-x-2 rounded-md border p-2.5 hover:bg-accent/50 transition-colors"
                        >
                          <RadioGroupItem value={mode} id={`theme-${mode}`} />
                          <Label
                            htmlFor={`theme-${mode}`}
                            className="flex-1 cursor-pointer font-normal text-sm"
                          >
                            {t(`theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Version Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("versionSection")}</h3>
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                      <span className="text-sm">{t("currentVersion")}</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        v{packageJson.version}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                {/* ─────────────────────────────────────────────────────────────────
                    Application Tab
                ───────────────────────────────────────────────────────────────── */}
                <TabsContent value="application" className="space-y-6 pr-4">
                  {/* VRChat Path Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("pathTitle")}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{t("pathDescription")}</p>

                    {/* Current Path Display */}
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        settings.vrchatPath
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-yellow-500/30 bg-yellow-500/5"
                      )}
                    >
                      {settings.vrchatPath ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-yellow-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {settings.vrchatPath ? t("pathFound") : t("pathNotConfigured")}
                        </p>
                        {settings.vrchatPath && (
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={settings.vrchatPath}
                          >
                            {settings.vrchatPath}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Path Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDetectPath}
                        disabled={isDetectingPath}
                      >
                        {isDetectingPath ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {t("pathAutoDetect")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleBrowsePath}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {t("pathBrowse")}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* System Tray Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MonitorDown className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("trayTitle")}</h3>
                    </div>

                    {/* Minimize to Tray */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{t("trayMinimizeToTray")}</Label>
                        <p className="text-muted-foreground text-xs">{t("trayMinimizeToTrayHint")}</p>
                      </div>
                      <Switch
                        checked={settings.tray.minimizeToTray}
                        onCheckedChange={(checked) =>
                          updateSettings("tray", { ...settings.tray, minimizeToTray: checked })
                        }
                      />
                    </div>

                    {/* Desktop Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm">{t("trayShowNotifications")}</Label>
                        </div>
                        <p className="text-muted-foreground text-xs">{t("trayShowNotificationsHint")}</p>
                      </div>
                      <Switch
                        checked={settings.tray.showDesktopNotifications}
                        onCheckedChange={(checked) =>
                          updateSettings("tray", { ...settings.tray, showDesktopNotifications: checked })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ─────────────────────────────────────────────────────────────────
                    Inviter Tab
                ───────────────────────────────────────────────────────────────── */}
                <TabsContent value="inviter" className="space-y-6 pr-4">
                  {/* Rate Limit Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("settingsRateLimitTitle")}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{t("settingsRateLimitDescription")}</p>

                    <div className="space-y-5">
                      <SliderField
                        label={t("settingsBatchSize")}
                        value={settings.rateLimit.inviteBatchCount}
                        onChange={(v) =>
                          updateSettings("rateLimit", { ...settings.rateLimit, inviteBatchCount: v })
                        }
                        min={1}
                        max={50}
                        hint={t("settingsBatchSizeHint")}
                        disabled={isSaving}
                      />

                      <SliderField
                        label={t("settingsBatchDelay")}
                        value={settings.rateLimit.inviteBatchDelay}
                        onChange={(v) =>
                          updateSettings("rateLimit", { ...settings.rateLimit, inviteBatchDelay: v })
                        }
                        min={1}
                        max={300}
                        unit="s"
                        hint={t("settingsBatchDelayHint")}
                        disabled={isSaving}
                      />

                      <SliderField
                        label={t("settingsDelayBetween")}
                        value={settings.rateLimit.inviteDelayBetween}
                        onChange={(v) =>
                          updateSettings("rateLimit", { ...settings.rateLimit, inviteDelayBetween: v })
                        }
                        min={0.5}
                        max={60}
                        step={0.5}
                        unit="s"
                        hint={t("settingsDelayBetweenHint")}
                        disabled={isSaving}
                      />

                      <SliderField
                        label={t("settingsQueueThreshold")}
                        value={settings.rateLimit.queueThreshold}
                        onChange={(v) =>
                          updateSettings("rateLimit", { ...settings.rateLimit, queueThreshold: v })
                        }
                        min={10}
                        max={500}
                        hint={t("settingsQueueThresholdHint")}
                        disabled={isSaving}
                      />

                      <SliderField
                        label={t("settingsQueuePauseDuration")}
                        value={settings.rateLimit.queuePauseDelay}
                        onChange={(v) =>
                          updateSettings("rateLimit", { ...settings.rateLimit, queuePauseDelay: v })
                        }
                        min={60}
                        max={3600}
                        step={10}
                        unit="s"
                        hint={t("settingsQueuePauseDurationHint")}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Inviter Webhook Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("webhookTitle")}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{t("webhookDescription")}</p>

                    {/* Enable Webhooks Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{t("webhookEnable")}</Label>
                        <p className="text-muted-foreground text-xs">{t("webhookEnableHint")}</p>
                      </div>
                      <Switch
                        checked={settings.inviterWebhook.enabled}
                        onCheckedChange={(checked) =>
                          updateSettings("inviterWebhook", {
                            ...settings.inviterWebhook,
                            enabled: checked,
                          })
                        }
                      />
                    </div>

                    {/* Webhook URLs */}
                    {settings.inviterWebhook.enabled && (
                      <div className="space-y-4 rounded-lg border p-4">
                        {/* Success Webhook URL */}
                        <div className="space-y-2">
                          <Label className="text-sm">{t("webhookSuccessUrl")}</Label>
                          <Input
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.inviterWebhook.successUrl}
                            onChange={(e) =>
                              updateSettings("inviterWebhook", {
                                ...settings.inviterWebhook,
                                successUrl: e.target.value,
                              })
                            }
                          />
                          <p className="text-muted-foreground text-xs">{t("webhookSuccessUrlHint")}</p>
                        </div>

                        {/* Warning Webhook URL */}
                        <div className="space-y-2">
                          <Label className="text-sm">{t("webhookWarningUrl")}</Label>
                          <Input
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.inviterWebhook.warningUrl}
                            onChange={(e) =>
                              updateSettings("inviterWebhook", {
                                ...settings.inviterWebhook,
                                warningUrl: e.target.value,
                              })
                            }
                          />
                          <p className="text-muted-foreground text-xs">{t("webhookWarningUrlHint")}</p>
                        </div>

                        {/* Error Webhook URL */}
                        <div className="space-y-2">
                          <Label className="text-sm">{t("webhookErrorUrl")}</Label>
                          <Input
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.inviterWebhook.errorUrl}
                            onChange={(e) =>
                              updateSettings("inviterWebhook", {
                                ...settings.inviterWebhook,
                                errorUrl: e.target.value,
                              })
                            }
                          />
                          <p className="text-muted-foreground text-xs">{t("webhookErrorUrlHint")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ─────────────────────────────────────────────────────────────────
                    Instance Monitor Tab
                ───────────────────────────────────────────────────────────────── */}
                <TabsContent value="instance" className="space-y-6 pr-4">
                  {/* Instance Webhook Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{t("instanceWebhookTitle")}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{t("instanceWebhookDescription")}</p>

                    {/* Enable Webhooks Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{t("instanceWebhookEnable")}</Label>
                        <p className="text-muted-foreground text-xs">{t("instanceWebhookEnableHint")}</p>
                      </div>
                      <Switch
                        checked={settings.instanceWebhook.enabled}
                        onCheckedChange={(checked) =>
                          updateSettings("instanceWebhook", {
                            ...settings.instanceWebhook,
                            enabled: checked,
                          })
                        }
                      />
                    </div>

                    {/* Webhook URL */}
                    {settings.instanceWebhook.enabled && (
                      <div className="space-y-2 rounded-lg border p-4">
                        <Label className="text-sm">{t("instanceWebhookUrl")}</Label>
                        <Input
                          type="url"
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.instanceWebhook.webhookUrl}
                          onChange={(e) =>
                            updateSettings("instanceWebhook", {
                              ...settings.instanceWebhook,
                              webhookUrl: e.target.value,
                            })
                          }
                        />
                        <p className="text-muted-foreground text-xs">{t("instanceWebhookUrlHint")}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="mt-4 flex-row gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleResetAll} disabled={isSaving}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("settingsResetDefaults")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settingsSaving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settingsSave")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
