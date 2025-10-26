"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface UserSettings {
  // Timer
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;

  // Focus Detection
  cameraEnabled: boolean;
  distractionThreshold: number;
  pauseOnDistraction: boolean;

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

const DEFAULT_SETTINGS: UserSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  cameraEnabled: false,
  distractionThreshold: 3,
  pauseOnDistraction: true,
  soundEnabled: true,
  desktopNotifications: true,
  breakReminders: true,
  eyeStrainReminders: true,
  dataRetention: 30,
  localProcessing: true,
  analyticsSharing: false,
  theme: "system",
  reducedMotion: false,
};

export function useSettings() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings
  // Add logging to fetchSettings:
  const fetchSettings = useCallback(async () => {
    console.log("🔧 Fetching settings, auth status:", status);

    if (status !== "authenticated") {
      console.log("⚠️ Not authenticated, using defaults");
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("📡 Fetching settings from API...");
      const response = await fetch("/api/settings");

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Settings fetched:", data.settings);
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      } else if (response.status === 404) {
        console.log("⚠️ No settings found, using defaults");
        setSettings(DEFAULT_SETTINGS);
      } else {
        throw new Error("Failed to fetch settings");
      }
    } catch (err: any) {
      console.error("❌ Settings fetch failed:", err);
      setError(err.message);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (status !== "authenticated") {
        // Update local state only for unauthenticated users
        setSettings((prev) => ({ ...prev, ...newSettings }));
        return;
      }

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
        setSettings(data.settings);
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [status]
  );

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    if (status !== "authenticated") {
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });

      if (response.ok) {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [status]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    refetch: fetchSettings,
  };
}
