"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import {
  Shield,
  Bell,
  Palette,
  Eye,
  Timer,
  Save,
  RotateCcw,
} from "lucide-react";

interface SettingsState {
  // Timer Settings
  pomodoroLength: number;
  shortBreakLength: number;
  longBreakLength: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;

  // Focus Detection
  distractionThreshold: number;
  pauseOnDistraction: boolean;
  gazeCalibration: boolean;
  cameraEnabled: boolean;

  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  breakReminders: boolean;
  eyeStrainReminders: boolean;

  // Privacy
  dataRetention: number;
  localProcessing: boolean;
  analyticsSharing: boolean;

  // Appearance
  theme: string;
  reducedMotion: boolean;
}

export function SettingsInterface() {
  const [settings, setSettings] = useState<SettingsState>({
    pomodoroLength: 25,
    shortBreakLength: 5,
    longBreakLength: 15,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    distractionThreshold: 3,
    pauseOnDistraction: true,
    gazeCalibration: false,
    cameraEnabled: true,
    soundEnabled: true,
    desktopNotifications: true,
    breakReminders: true,
    eyeStrainReminders: true,
    dataRetention: 30,
    localProcessing: true,
    analyticsSharing: false,
    theme: "dark",
    reducedMotion: false,
  });

  const updateSetting = (key: keyof SettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    // Reset logic would go here
    console.log("Resetting to defaults...");
  };

  const saveSettings = () => {
    // Save logic would go here
    console.log("Saving settings...", settings);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Timer Configuration */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Timer Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your Pomodoro timer preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Pomodoro Length
            </label>
            <div className="space-y-2">
              <Slider
                value={[settings.pomodoroLength]}
                onValueChange={(value) =>
                  updateSetting("pomodoroLength", value[0])
                }
                max={60}
                min={15}
                step={5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {settings.pomodoroLength} minutes
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Short Break
            </label>
            <div className="space-y-2">
              <Slider
                value={[settings.shortBreakLength]}
                onValueChange={(value) =>
                  updateSetting("shortBreakLength", value[0])
                }
                max={15}
                min={3}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {settings.shortBreakLength} minutes
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Long Break
            </label>
            <div className="space-y-2">
              <Slider
                value={[settings.longBreakLength]}
                onValueChange={(value) =>
                  updateSetting("longBreakLength", value[0])
                }
                max={30}
                min={10}
                step={5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {settings.longBreakLength} minutes
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Auto-start breaks
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically start break timers
              </p>
            </div>
            <Switch
              checked={settings.autoStartBreaks}
              onCheckedChange={(checked) =>
                updateSetting("autoStartBreaks", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Auto-start pomodoros
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically start work sessions after breaks
              </p>
            </div>
            <Switch
              checked={settings.autoStartPomodoros}
              onCheckedChange={(checked) =>
                updateSetting("autoStartPomodoros", checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Focus Detection */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Focus Detection
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure camera-based attention tracking
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Enable camera tracking
              </label>
              <p className="text-xs text-muted-foreground">
                Use camera to monitor focus levels
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={settings.cameraEnabled ? "default" : "secondary"}
                className="text-xs"
              >
                {settings.cameraEnabled ? "Active" : "Disabled"}
              </Badge>
              <Switch
                checked={settings.cameraEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("cameraEnabled", checked)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Distraction threshold
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              How long you can look away before being marked as distracted
            </p>
            <Slider
              value={[settings.distractionThreshold]}
              onValueChange={(value) =>
                updateSetting("distractionThreshold", value[0])
              }
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-center">
              {settings.distractionThreshold} seconds
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Pause timer on distraction
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically pause when you look away
              </p>
            </div>
            <Switch
              checked={settings.pauseOnDistraction}
              onCheckedChange={(checked) =>
                updateSetting("pauseOnDistraction", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Gaze calibration
              </label>
              <p className="text-xs text-muted-foreground">
                Improve accuracy with personalized calibration
              </p>
            </div>
            <Button variant="outline" size="sm">
              Calibrate Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications & Sounds */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Notifications & Sounds
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage alerts and audio feedback
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Sound notifications
              </label>
              <p className="text-xs text-muted-foreground">
                Play sounds for timer events
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) =>
                updateSetting("soundEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Desktop notifications
              </label>
              <p className="text-xs text-muted-foreground">
                Show system notifications
              </p>
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) =>
                updateSetting("desktopNotifications", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Break reminders
              </label>
              <p className="text-xs text-muted-foreground">
                Remind you to take breaks
              </p>
            </div>
            <Switch
              checked={settings.breakReminders}
              onCheckedChange={(checked) =>
                updateSetting("breakReminders", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Eye strain reminders
              </label>
              <p className="text-xs text-muted-foreground">
                Suggest eye rest during long sessions
              </p>
            </div>
            <Switch
              checked={settings.eyeStrainReminders}
              onCheckedChange={(checked) =>
                updateSetting("eyeStrainReminders", checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Privacy & Data */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Privacy & Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Control your data and privacy settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Local processing only
              </label>
              <p className="text-xs text-muted-foreground">
                All camera analysis happens on your device
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-green-500">
                Enabled
              </Badge>
              <Switch
                checked={settings.localProcessing}
                onCheckedChange={(checked) =>
                  updateSetting("localProcessing", checked)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Data retention
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              How long to keep your session data
            </p>
            <Select
              value={settings.dataRetention.toString()}
              onValueChange={(value) =>
                updateSetting("dataRetention", Number.parseInt(value))
              }
            >
              <SelectTrigger className="w-full">
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

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Anonymous analytics
              </label>
              <p className="text-xs text-muted-foreground">
                Help improve FocusFlow with usage data
              </p>
            </div>
            <Switch
              checked={settings.analyticsSharing}
              onCheckedChange={(checked) =>
                updateSetting("analyticsSharing", checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Appearance
            </h3>
            <p className="text-sm text-muted-foreground">
              Customize the look and feel
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Theme</label>
            <Select
              value={settings.theme}
              onValueChange={(value) => updateSetting("theme", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Reduced motion
              </label>
              <p className="text-xs text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) =>
                updateSetting("reducedMotion", checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="gap-2 bg-transparent text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>

        <Button onClick={saveSettings} className="gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
