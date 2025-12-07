"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface Settings {
  // Timer Settings
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;

  // Focus Detection
  cameraEnabled: boolean;
  distractionThreshold: number;
  pauseOnDistraction: boolean;

  previewEnabled: boolean; // show/hide visible preview
  overlayEnabled: boolean; // draw landmarks overlay
  mirrorVideo: boolean; // mirror preview + detector input

  // Focus integrator tuning
  minFocusConfidence: number; // 0..100 (confidence gate)
  focusGainPerSec: number; // +%/sec when focused
  defocusLossPerSec: number; // -%/sec when looking away (face present)
  noFaceLossPerSec: number; // -%/sec when no face

  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  breakReminders: boolean;
  eyeStrainReminders: boolean;

  // Privacy
  dataRetention: number;
  analyticsSharing: boolean;
  localProcessing: boolean; // explicit flag to match backend

  // Appearance
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;

  // Pomodoro rhythm
  pomodorosBeforeLongBreak: number; // e.g. 4 focus blocks before long break
}

const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,

  cameraEnabled: true,
  distractionThreshold: 3,
  pauseOnDistraction: true,

  soundEnabled: true,
  desktopNotifications: true,
  breakReminders: true,
  eyeStrainReminders: true,

  dataRetention: 30,
  analyticsSharing: false,
  localProcessing: true,

  theme: "system",
  reducedMotion: false,

  previewEnabled: true,
  overlayEnabled: true,
  mirrorVideo: true,
  minFocusConfidence: 35,
  focusGainPerSec: 1.2,
  defocusLossPerSec: 4.0,
  noFaceLossPerSec: 6.0,

  pomodorosBeforeLongBreak: 4,
};

export function useSettings() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (status !== "authenticated") {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/settings", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          await createDefaultSettings();
          return;
        }
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      if (data.success && data.data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
      }
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      setError(err.message);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  const createDefaultSettings = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_SETTINGS),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
      }
    } catch (err) {
      console.error("Error creating default settings:", err);
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      const data = await response.json();
      if (data.success && data.data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
        return data.data.settings;
      }
    } catch (err: any) {
      console.error("Error updating settings:", err);
      throw err;
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to reset settings");
      }

      const data = await response.json();
      if (data.success && data.data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data.settings });
        return data.data.settings;
      }
    } catch (err: any) {
      console.error("Error resetting settings:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    refetchSettings: fetchSettings,
  };
}
