/**
 * Rate Limit Settings
 * Settings form for configuring rate limits and VRChat path
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw, Save, Info, FolderOpen, RefreshCw, Gamepad2, CheckCircle2, XCircle, MonitorDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/utils/tailwind";

interface RateLimitSettingsProps {
  className?: string;
}

interface SettingFieldProps {
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

function SettingField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  unit,
  disabled,
}: SettingFieldProps) {
  return (
    <div className="space-y-3">
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
      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {hint}
      </p>
    </div>
  );
}

export function RateLimitSettings({ className }: RateLimitSettingsProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    inviteBatchCount: 8,
    inviteBatchDelay: 12,
    inviteDelayBetween: 2,
    queueThreshold: 88,
    queuePauseDelay: 600,
  });

  // VRChat path state
  const [vrchatPath, setVrchatPath] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Tray settings state
  const [traySettings, setTraySettings] = useState({
    minimizeToTray: true,
    showDesktopNotifications: true,
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loaded, path, tray] = await Promise.all([
          window.vrchatAPI.getSettings(),
          window.vrchatAPI.getVRChatPath(),
          window.trayAPI.getSettings(),
        ]);
        setSettings(loaded);
        setVrchatPath(path);
        setTraySettings(tray);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.vrchatAPI.setSettings(settings);
      toast.success(t("settingsSaved"));
    } catch (error) {
      toast.error(t("settingsSaveFailed", { error: String(error) }));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleReset = async () => {
    setIsSaving(true);
    try {
      const defaults = await window.vrchatAPI.resetSettings();
      setSettings(defaults);
      toast.success(t("settingsResetSuccess"));
    } catch (error) {
      toast.error(t("settingsResetFailed", { error: String(error) }));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle browse for VRChat path
  const handleBrowse = async () => {
    try {
      const selected = await window.vrchatAPI.browseVRChatPath();
      if (selected) {
        const success = await window.vrchatAPI.setVRChatPath(selected);
        if (success) {
          setVrchatPath(selected);
          toast.success(t("pathSaved"));
        } else {
          toast.error(t("pathInvalid"));
        }
      }
    } catch (error) {
      toast.error(t("pathBrowseFailed", { error: String(error) }));
    }
  };

  // Handle auto-detect VRChat path
  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const detected = await window.vrchatAPI.detectVRChatPath();
      if (detected) {
        const success = await window.vrchatAPI.setVRChatPath(detected);
        if (success) {
          setVrchatPath(detected);
          toast.success(t("pathDetected"));
        }
      } else {
        toast.error(t("pathNotFound"));
      }
    } catch (error) {
      toast.error(t("pathDetectFailed", { error: String(error) }));
    } finally {
      setIsDetecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* VRChat Path Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("pathTitle")}</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("pathDescription")}
        </p>

        {/* Current Path Display */}
        <div className={cn(
          "flex items-center gap-3 rounded-lg border p-3",
          vrchatPath ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
        )}>
          {vrchatPath ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-yellow-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {vrchatPath ? t("pathFound") : t("pathNotConfigured")}
            </p>
            {vrchatPath && (
              <p className="truncate text-xs text-muted-foreground" title={vrchatPath}>
                {vrchatPath}
              </p>
            )}
          </div>
        </div>

        {/* Path Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetect}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {t("pathAutoDetect")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBrowse}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {t("pathBrowse")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* System Tray Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MonitorDown className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("trayTitle")}</h2>
        </div>

        {/* Minimize to Tray Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">{t("trayMinimizeToTray")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("trayMinimizeToTrayHint")}
            </p>
          </div>
          <Switch
            checked={traySettings.minimizeToTray}
            onCheckedChange={async (checked) => {
              const updated = { ...traySettings, minimizeToTray: checked };
              setTraySettings(updated);
              await window.trayAPI.setSettings({ minimizeToTray: checked });
            }}
          />
        </div>

        {/* Desktop Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">{t("trayShowNotifications")}</Label>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("trayShowNotificationsHint")}
            </p>
          </div>
          <Switch
            checked={traySettings.showDesktopNotifications}
            onCheckedChange={async (checked) => {
              const updated = { ...traySettings, showDesktopNotifications: checked };
              setTraySettings(updated);
              await window.trayAPI.setSettings({ showDesktopNotifications: checked });
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Rate Limit Settings Section */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("settingsRateLimitTitle")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("settingsRateLimitDescription")}
        </p>
      </div>

      <div className="space-y-6">
        <SettingField
          label={t("settingsBatchSize")}
          value={settings.inviteBatchCount}
          onChange={(v) => setSettings((s) => ({ ...s, inviteBatchCount: v }))}
          min={1}
          max={50}
          hint={t("settingsBatchSizeHint")}
          disabled={isSaving}
        />

        <SettingField
          label={t("settingsBatchDelay")}
          value={settings.inviteBatchDelay}
          onChange={(v) => setSettings((s) => ({ ...s, inviteBatchDelay: v }))}
          min={1}
          max={300}
          unit="s"
          hint={t("settingsBatchDelayHint")}
          disabled={isSaving}
        />

        <SettingField
          label={t("settingsDelayBetween")}
          value={settings.inviteDelayBetween}
          onChange={(v) => setSettings((s) => ({ ...s, inviteDelayBetween: v }))}
          min={0.5}
          max={60}
          step={0.5}
          unit="s"
          hint={t("settingsDelayBetweenHint")}
          disabled={isSaving}
        />

        <SettingField
          label={t("settingsQueueThreshold")}
          value={settings.queueThreshold}
          onChange={(v) => setSettings((s) => ({ ...s, queueThreshold: v }))}
          min={10}
          max={500}
          hint={t("settingsQueueThresholdHint")}
          disabled={isSaving}
        />

        <SettingField
          label={t("settingsQueuePauseDuration")}
          value={settings.queuePauseDelay}
          onChange={(v) => setSettings((s) => ({ ...s, queuePauseDelay: v }))}
          min={60}
          max={3600}
          step={10}
          unit="s"
          hint={t("settingsQueuePauseDurationHint")}
          disabled={isSaving}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("settingsResetDefaults")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
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
      </div>
    </div>
  );
}
