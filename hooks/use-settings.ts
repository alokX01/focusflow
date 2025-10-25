"use client"

import { useEffect, useState, useCallback } from "react"

export type AppSettings = {
  focusDuration: number
  breakDuration: number
  longBreakDuration?: number
  sessionsBeforeLongBreak?: number
  cameraEnabled: boolean
  soundEnabled: boolean
  notificationsEnabled?: boolean
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/settings", { cache: "no-store" })
      const data = await res.json()
      setSettings({
        focusDuration: data.settings?.focusDuration ?? 25,
        breakDuration: data.settings?.breakDuration ?? 5,
        longBreakDuration: data.settings?.longBreakDuration ?? 15,
        sessionsBeforeLongBreak: data.settings?.sessionsBeforeLongBreak ?? 4,
        cameraEnabled: data.settings?.cameraEnabled ?? false,
        soundEnabled: data.settings?.soundEnabled ?? true,
        notificationsEnabled: data.settings?.notificationsEnabled ?? true,
      })
    } catch (e: any) {
      setError(e?.message || "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (next: Partial<AppSettings>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(settings || {}), ...next }),
      })
      const data = await res.json()
      setSettings(prev => ({ ...(prev || {} as AppSettings), ...data.settings }))
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return { settings, loading, error, fetchSettings, saveSettings, setSettings }
}