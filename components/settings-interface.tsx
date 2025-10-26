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
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";

export function SettingsInterface() {
  const { settings, isLoading, updateSettings, resetSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      try {
        await resetSettings();
        setHasChanges(false);
        toast.success("Settings reset to defaults");
      } catch (error) {
        toast.error("Failed to reset settings");
      }
    }
  };

  if (isLoading) {
    return <SettingsLoading />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
                <CardTitle>Timer Settings</CardTitle>
                <CardDescription>
                  Configure your Pomodoro timer preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SliderSetting
                label="Pomodoro Length"
                value={localSettings.focusDuration || 25}
                onChange={(v) => handleChange("focusDuration", v)}
                min={15}
                max={60}
                step={5}
                unit="minutes"
              />
              <SliderSetting
                label="Short Break"
                value={localSettings.shortBreakDuration || 5}
                onChange={(v) => handleChange("shortBreakDuration", v)}
                min={3}
                max={15}
                step={1}
                unit="minutes"
              />
              <SliderSetting
                label="Long Break"
                value={localSettings.longBreakDuration || 15}
                onChange={(v) => handleChange("longBreakDuration", v)}
                min={10}
                max={30}
                step={5}
                unit="minutes"
              />
            </div>

            <div className="space-y-4">
              <SwitchSetting
                label="Auto-start breaks"
                description="Automatically start break timers"
                checked={localSettings.autoStartBreaks || false}
                onChange={(v) => handleChange("autoStartBreaks", v)}
              />
              <SwitchSetting
                label="Auto-start pomodoros"
                description="Automatically start work sessions after breaks"
                checked={localSettings.autoStartPomodoros || false}
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
                <CardTitle>Focus Detection</CardTitle>
                <CardDescription>
                  Configure camera-based attention tracking
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable camera tracking</p>
                <p className="text-xs text-muted-foreground">
                  Use camera to monitor focus levels
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
                  checked={localSettings.cameraEnabled || false}
                  onCheckedChange={(v) => handleChange("cameraEnabled", v)}
                />
              </div>
            </div>

            <SliderSetting
              label="Distraction threshold"
              description="How long you can look away before being marked as distracted"
              value={localSettings.distractionThreshold || 3}
              onChange={(v) => handleChange("distractionThreshold", v)}
              min={1}
              max={10}
              step={1}
              unit="seconds"
            />

            <SwitchSetting
              label="Pause timer on distraction"
              description="Automatically pause when you look away"
              checked={localSettings.pauseOnDistraction || false}
              onChange={(v) => handleChange("pauseOnDistraction", v)}
            />

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-sm font-medium">Gaze calibration</p>
                <p className="text-xs text-muted-foreground">
                  Improve accuracy with personalized calibration
                </p>
              </div>
              <Button variant="outline" size="sm">
                Calibrate Now
              </Button>
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
                <CardTitle>Notifications & Sounds</CardTitle>
                <CardDescription>
                  Manage alerts and audio feedback
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchSetting
              label="Sound notifications"
              description="Play sounds for timer events"
              checked={localSettings.soundEnabled || false}
              onChange={(v) => handleChange("soundEnabled", v)}
            />
            <SwitchSetting
              label="Desktop notifications"
              description="Show system notifications"
              checked={localSettings.desktopNotifications || false}
              onChange={(v) => handleChange("desktopNotifications", v)}
            />
            <SwitchSetting
              label="Break reminders"
              description="Remind you to take breaks"
              checked={localSettings.breakReminders || false}
              onChange={(v) => handleChange("breakReminders", v)}
            />
            <SwitchSetting
              label="Eye strain reminders"
              description="Suggest eye rest during long sessions"
              checked={localSettings.eyeStrainReminders || false}
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
                <CardTitle>Privacy & Data</CardTitle>
                <CardDescription>
                  Control your data and privacy settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Local processing only</p>
                <p className="text-xs text-muted-foreground">
                  All camera analysis happens on your device
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  Enabled
                </Badge>
                <Switch checked disabled />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data retention</label>
              <p className="text-xs text-muted-foreground mb-2">
                How long to keep your session data
              </p>
              <Select
                value={localSettings.dataRetention?.toString() || "30"}
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
              label="Anonymous analytics"
              description="Help improve FocusFlow with usage data"
              checked={localSettings.analyticsSharing || false}
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
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select
                value={localSettings.theme || "system"}
                onValueChange={(v) => handleChange("theme", v)}
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
              description="Minimize animations and transitions"
              checked={localSettings.reducedMotion || false}
              onChange={(v) => handleChange("reducedMotion", v)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between pt-6 border-t border-border sticky bottom-0 bg-background py-4"
      >
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
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
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
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
