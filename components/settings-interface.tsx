"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Bell,
  Palette,
  Eye,
  Timer,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useSettingsContext } from "@/contexts/settings-context";
import { Settings } from "@/hooks/use-settings";
import { toast } from "@/hooks/use-toast";
import { Input } from "./ui/input";

export function SettingsInterface() {
  const { settings, isLoading, updateSettings, resetSettings } =
    useSettingsContext();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  // Sync local copy when global settings change
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleChange = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      toast({ title: "Settings saved." });
    } catch (error) {
      toast({ title: "Failed to save settings", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Reset all settings to default values? This won't affect your past sessions."
      )
    ) {
      return;
    }
    try {
      await resetSettings();
      setHasChanges(false);
      toast({ title: "Settings reset to defaults." });
    } catch (error) {
      toast({ title: "Failed to reset settings", variant: "destructive" });
      console.error(error);
    }
  };

  if (isLoading) {
    return <SettingsLoading />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Timer Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Focus & breaks</CardTitle>
                <CardDescription>
                  Choose how long you focus and how often you earn longer
                  breaks.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SliderSetting
                label="Focus block"
                value={localSettings.focusDuration}
                onChange={(v) => handleChange("focusDuration", v)}
                min={15}
                max={60}
                step={5}
                unit="minutes"
              />
              <SliderSetting
                label="Short break"
                value={localSettings.shortBreakDuration}
                onChange={(v) => handleChange("shortBreakDuration", v)}
                min={3}
                max={15}
                step={1}
                unit="minutes"
              />
              <SliderSetting
                label="Long break"
                value={localSettings.longBreakDuration}
                onChange={(v) => handleChange("longBreakDuration", v)}
                min={10}
                max={30}
                step={5}
                unit="minutes"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberSetting
                label="Focus blocks before long break"
                description="How many focus sessions you complete before taking a longer reset."
                value={localSettings.pomodorosBeforeLongBreak}
                min={1}
                max={8}
                step={1}
                onChange={(num) =>
                  handleChange("pomodorosBeforeLongBreak", num)
                }
              />
            </div>

            <div className="space-y-4">
              <SwitchSetting
                label="Auto-start breaks"
                description="When a focus block ends, start the break timer automatically."
                checked={localSettings.autoStartBreaks}
                onChange={(v) => handleChange("autoStartBreaks", v)}
              />
              <SwitchSetting
                label="Auto-start focus blocks"
                description="When a break ends, automatically start the next focus block."
                checked={localSettings.autoStartPomodoros}
                onChange={(v) => handleChange("autoStartPomodoros", v)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Focus Detection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Focus detection</CardTitle>
                <CardDescription>
                  Let the camera nudge you when your attention drifts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable camera tracking</p>
                <p className="text-xs text-muted-foreground">
                  Use your camera to estimate focus levels during work blocks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    localSettings.cameraEnabled ? "default" : "secondary"
                  }
                >
                  {localSettings.cameraEnabled ? "Active" : "Disabled"}
                </Badge>
                <Switch
                  checked={localSettings.cameraEnabled}
                  onCheckedChange={(v) => handleChange("cameraEnabled", v)}
                />
              </div>
            </div>

            {/* Vision controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SwitchSetting
                label="Show video preview"
                description="Display your camera feed while a focus session is running."
                checked={!!localSettings.previewEnabled}
                onChange={(v) => handleChange("previewEnabled", v)}
              />
              <SwitchSetting
                label="Show overlay"
                description="Draw landmarks on the preview so you can see what the model sees."
                checked={!!localSettings.overlayEnabled}
                onChange={(v) => handleChange("overlayEnabled", v)}
              />
              <SwitchSetting
                label="Mirror video"
                description="Flip the preview horizontally (like a front-facing camera)."
                checked={!!localSettings.mirrorVideo}
                onChange={(v) => handleChange("mirrorVideo", v)}
              />
            </div>

            {/* Distraction threshold + Pause on distraction */}
            <SliderSetting
              label="Distraction threshold"
              description="How long you can look away before we count it as a distraction."
              value={localSettings.distractionThreshold}
              onChange={(v) => handleChange("distractionThreshold", v)}
              min={1}
              max={10}
              step={1}
              unit="seconds"
            />
            <SwitchSetting
              label="Pause timer on distraction"
              description="Automatically pause the timer when you look away for too long."
              checked={localSettings.pauseOnDistraction}
              onChange={(v) => handleChange("pauseOnDistraction", v)}
            />

            {/* Focus scoring knobs */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                Advanced tracking tuning
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SliderSetting
                  label="Minimum focus confidence"
                  description="Confidence threshold required to count as focused."
                  value={localSettings.minFocusConfidence}
                  onChange={(v) => handleChange("minFocusConfidence", v)}
                  min={0}
                  max={100}
                  step={1}
                  unit=""
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumberSetting
                    label="Gain when focused"
                    description="% per second"
                    value={Number(localSettings.focusGainPerSec ?? 1.2)}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(num) => handleChange("focusGainPerSec", num)}
                  />
                  <NumberSetting
                    label="Loss when looking away"
                    description="% per second"
                    value={Number(localSettings.defocusLossPerSec ?? 4.0)}
                    min={0}
                    max={20}
                    step={0.1}
                    onChange={(num) => handleChange("defocusLossPerSec", num)}
                  />
                  <NumberSetting
                    label="Loss when no face"
                    description="% per second"
                    value={Number(localSettings.noFaceLossPerSec ?? 6.0)}
                    min={0}
                    max={30}
                    step={0.1}
                    onChange={(num) => handleChange("noFaceLossPerSec", num)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>Notifications & sound</CardTitle>
                <CardDescription>
                  Decide how loudly the app should talk to you.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchSetting
              label="Sound notifications"
              description="Play short sounds when sessions start, pause, or complete."
              checked={localSettings.soundEnabled}
              onChange={(v) => handleChange("soundEnabled", v)}
            />
            <SwitchSetting
              label="Desktop notifications"
              description="Show system notifications when a session finishes."
              checked={localSettings.desktopNotifications}
              onChange={(v) => handleChange("desktopNotifications", v)}
            />
            <SwitchSetting
              label="Break reminders"
              description="Remind you to take breaks if you work for a long stretch."
              checked={localSettings.breakReminders}
              onChange={(v) => handleChange("breakReminders", v)}
            />
            <SwitchSetting
              label="Eye strain reminders"
              description="Suggest quick eye rests during longer focus periods."
              checked={localSettings.eyeStrainReminders}
              onChange={(v) => handleChange("eyeStrainReminders", v)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Privacy & data</CardTitle>
                <CardDescription>
                  How your focus data is handled and stored.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Local processing only</p>
                <p className="text-xs text-muted-foreground">
                  Camera analysis happens on your device. Video is not sent to
                  our servers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    localSettings.localProcessing ? "default" : "outline"
                  }
                  className="bg-green-500 text-white"
                >
                  Enabled
                </Badge>
                <Switch checked disabled />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data retention</label>
              <p className="text-xs text-muted-foreground mb-2">
                How long to keep your session history.
              </p>
              <Select
                value={localSettings.dataRetention.toString()}
                onValueChange={(v) =>
                  handleChange("dataRetention", parseInt(v))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SwitchSetting
              label="Anonymous usage analytics"
              description="Share anonymized usage patterns to help improve FocusFlow."
              checked={localSettings.analyticsSharing}
              onChange={(v) => handleChange("analyticsSharing", v)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Adjust theme and motion.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select
                value={localSettings.theme}
                onValueChange={(v) =>
                  handleChange("theme", v as "light" | "dark" | "system")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SwitchSetting
              label="Reduced motion"
              description="Minimize animations for a calmer experience."
              checked={localSettings.reducedMotion}
              onChange={(v) => handleChange("reducedMotion", v)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons - Fixed at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50"
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save settings
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function SliderSetting({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="space-y-2">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        <div className="text-sm text-center text-muted-foreground">
          {value} {unit}
        </div>
      </div>
    </div>
  );
}

function SwitchSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumberSetting({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return;
          const clamped = Math.max(min, Math.min(max, raw));
          onChange(step === 1 ? Math.round(clamped) : clamped);
        }}
      />
    </div>
  );
}

function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
