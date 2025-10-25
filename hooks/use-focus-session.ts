"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type SessionState = {
  id: string
  targetDuration: number // seconds
  cameraEnabled: boolean
}

export function useFocusSession() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [focusPercentage, setFocusPercentage] = useState(100)
  const [distractionCount, setDistractionCount] = useState(0)
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const autosaveRef = useRef<NodeJS.Timeout | null>(null)

  // Start session
  const startSession = useCallback(async (targetDurationMinutes: number, cameraEnabled: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDuration: targetDurationMinutes,
          sessionType: "focus",
          cameraEnabled,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to start session")
      }
      const data = await res.json()
      const id = data.session._id as string
      const targetSec = targetDurationMinutes * 60

      setSession({ id, targetDuration: targetSec, cameraEnabled })
      setTimeRemaining(targetSec)
      setFocusPercentage(100)
      setDistractionCount(0)
      setIsPaused(false)
      setIsRunning(true)

      // Start timers
      tickRef.current = setInterval(() => {
        setTimeRemaining(prev => Math.max(prev - 1, 0))
      }, 1000)

      autosaveRef.current = setInterval(async () => {
        try {
          await fetch(`/api/sessions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              duration: (targetSec - (timeRemaining - 1)), // approx
              focusPercentage: Math.round(focusPercentage),
              distractionCount,
              isCompleted: false,
            }),
          })
        } catch {}
      }, 10000)
    } catch (e: any) {
      setError(e?.message || "Failed to start session")
    } finally {
      setLoading(false)
    }
  }, [distractionCount, focusPercentage, timeRemaining])

  // Pause / Resume
  const pauseSession = useCallback(async () => {
    if (!session) return
    setIsPaused(true)
    if (tickRef.current) clearInterval(tickRef.current)
  }, [session])

  const resumeSession = useCallback(async () => {
    if (!session) return
    setIsPaused(false)
    tickRef.current = setInterval(() => {
      setTimeRemaining(prev => Math.max(prev - 1, 0))
    }, 1000)
  }, [session])

  // Stop session
  const stopSession = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endTime: new Date(),
          duration: session.targetDuration - timeRemaining,
          focusPercentage: Math.round(focusPercentage),
          distractionCount,
          isCompleted: true,
        }),
      })
    } catch (e) {
      // swallow
    } finally {
      setIsRunning(false)
      setIsPaused(false)
      setSession(null)
      setTimeRemaining(0)
      if (tickRef.current) clearInterval(tickRef.current)
      if (autosaveRef.current) clearInterval(autosaveRef.current)
      setLoading(false)
    }
  }, [session, timeRemaining, focusPercentage, distractionCount])

  // Add distraction
  const addDistraction = useCallback(async (type: string, durationSec = 1, description?: string) => {
    if (!session) return
    setDistractionCount(prev => prev + 1)
    try {
      await fetch(`/api/sessions/${session.id}/distractions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          duration: durationSec,
          description,
        }),
      })
    } catch (e) {
      // ignore
    }
  }, [session])

  // Update focus
  const updateFocusPercentage = useCallback((value: number) => {
    setFocusPercentage(Math.max(0, Math.min(100, value)))
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (autosaveRef.current) clearInterval(autosaveRef.current)
    }
  }, [])

  return {
    session,
    isRunning,
    isPaused,
    timeRemaining,
    focusPercentage,
    distractionCount,
    isLookingAtScreen,
    setIsLookingAtScreen, // expose setter so TimerInterface can update this based on camera
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addDistraction,
    updateFocusPercentage,
    loading,
    error,
  }
}