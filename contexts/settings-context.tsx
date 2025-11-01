"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useSettings, Settings } from "@/hooks/use-settings";

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<Settings>) => Promise<any>;
  resetSettings: () => Promise<any>;
  refetchSettings: () => void;

  togglePreview: () => void;
  toggleOverlay: () => void;
  toggleMirror: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsData = useSettings();
  const { settings, updateSettings } = settingsData;

  // Apply theme when settings change
  useEffect(() => {
    applyTheme(settingsData.settings.theme);
  }, [settingsData.settings.theme]);

  // Apply reduced motion when settings change
  useEffect(() => {
    applyReducedMotion(settingsData.settings.reducedMotion);
  }, [settingsData.settings.reducedMotion]);

  const togglePreview = () =>
    updateSettings({ previewEnabled: !settings.previewEnabled });
  const toggleOverlay = () =>
    updateSettings({ overlayEnabled: !settings.overlayEnabled });
  const toggleMirror = () =>
    updateSettings({ mirrorVideo: !settings.mirrorVideo });

  const value: SettingsContextType = {
    ...settingsData,
    togglePreview,
    toggleOverlay,
    toggleMirror,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettingsContext must be used within SettingsProvider");
  }
  return context;
}

// Helper function to apply theme
function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.remove("light", "dark");
    root.classList.add(systemTheme);
  } else {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }

  // Store in localStorage for persistence
  localStorage.setItem("theme", theme);
}

// Helper function to apply reduced motion
function applyReducedMotion(reducedMotion: boolean) {
  if (reducedMotion) {
    document.documentElement.classList.add("reduce-motion");
  } else {
    document.documentElement.classList.remove("reduce-motion");
  }
}
