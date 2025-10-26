"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface FocusSession {
  _id?: string;
  targetDuration: number;
  sessionType: "focus" | "break" | "pomodoro";
  cameraEnabled: boolean;
  goal?: string;
  tags?: string[];
  startTime?: Date;
  focusPercentage: number;
  distractionCount: number;
}

interface Distraction {
  type: string;
  severity: number;
  note?: string;
  timestamp: Date;
}

export function useFocusSession() {
  const { data: authSession } = useSession();
  const [session, setSession] = useState<FocusSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [focusPercentage, setFocusPercentage] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining]);

  // Auto-stop when time reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && isRunning && session) {
      stopSession();
    }
  }, [timeRemaining, isRunning, session]);

  const createSession = useCallback(async (data: Partial<FocusSession>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const result = await response.json();
      return result.session;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSession = useCallback(
    async (sessionId: string, updates: Partial<FocusSession>) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update session");
        }

        return await response.json();
      } catch (err: any) {
        console.error("Update session error:", err);
        return null;
      }
    },
    []
  );

  const completeSession = useCallback(
    async (sessionId: string, finalData: any) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...finalData,
            isCompleted: true,
            endTime: new Date(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to complete session");
        }

        return await response.json();
      } catch (err: any) {
        console.error("Complete session error:", err);
        return null;
      }
    },
    []
  );

  const startSession = useCallback(
    async (targetDuration: number, cameraEnabled: boolean = false) => {
      console.log("🚀 START SESSION CALLED:", {
        targetDuration,
        cameraEnabled,
      });
      setLoading(true);
      setError(null);

      try {
        console.log("📡 Creating session via API...");
        const newSession = await createSession({
          targetDuration,
          sessionType: "focus",
          cameraEnabled,
          focusPercentage: 100,
          distractionCount: 0,
        });

        console.log("✅ Session created:", newSession);

        if (newSession) {
          setSession(newSession);
          setTimeRemaining(targetDuration * 60);
          setFocusPercentage(100);
          setDistractionCount(0);
          setIsRunning(true);
          setIsPaused(false);
          sessionIdRef.current = newSession._id;
          console.log("✅ Session state updated, ID:", newSession._id);
        }
      } catch (err: any) {
        console.error("❌ Session creation failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [createSession]
  );

  const pauseSession = useCallback(async () => {
    setIsPaused(true);

    if (sessionIdRef.current) {
      await updateSession(sessionIdRef.current, {
        focusPercentage,
        distractionCount,
      });
    }
  }, [focusPercentage, distractionCount, updateSession]);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopSession = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);

    if (sessionIdRef.current && session) {
      const elapsedTime = session.targetDuration * 60 - timeRemaining;

      await completeSession(sessionIdRef.current, {
        duration: elapsedTime,
        focusPercentage,
        distractionCount,
      });
    }

    // Reset state
    setSession(null);
    setTimeRemaining(0);
    setFocusPercentage(100);
    setDistractionCount(0);
    sessionIdRef.current = null;
  }, [
    session,
    timeRemaining,
    focusPercentage,
    distractionCount,
    completeSession,
  ]);

  const addDistraction = useCallback(
    async (type: string, severity: number, note?: string) => {
      setDistractionCount((prev) => prev + 1);
      setIsLookingAtScreen(false);

      if (sessionIdRef.current) {
        try {
          await fetch(`/api/sessions/${sessionIdRef.current}/distractions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              severity,
              note,
              timestamp: new Date(),
            }),
          });
        } catch (err) {
          console.error("Failed to log distraction:", err);
        }
      }

      // Auto-restore after 3 seconds
      setTimeout(() => {
        setIsLookingAtScreen(true);
      }, 3000);
    },
    []
  );

  const updateFocusPercentage = useCallback((newPercentage: number) => {
    setFocusPercentage(Math.max(0, Math.min(100, newPercentage)));
  }, []);

  return {
    session,
    isRunning,
    isPaused,
    timeRemaining,
    focusPercentage,
    distractionCount,
    isLookingAtScreen,
    loading,
    error,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addDistraction,
    updateFocusPercentage,
    createSession,
    updateSession,
    completeSession,
  };
}
