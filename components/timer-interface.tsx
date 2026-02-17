"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  AlertTriangle,
  Coffee,
  Target,
  Clock,
  Sparkles,
  History,
  Brain,
  TrendingUp,
  Lightbulb,
  Award,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSettingsContext } from "@/contexts/settings-context";

import {
  requestCameraAccess,
  ensureFaceFocus,
  startFaceFocus,
  stopFaceFocus,
  subscribeFaceFocus,
  cleanupFaceDetection,
  setFaceFocusOptions,
  type FaceFocusSnapshot,
} from "@/lib/face-detection";

type SessionType = "focus" | "shortBreak" | "longBreak";
type PauseReason = null | "manual" | "auto";

interface TaskModalData {
  task: string;
  sessionType: SessionType;
}

// Simple sounds
const playSound = (type: "start" | "pause" | "complete", enabled: boolean) => {
  if (!enabled) return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const tones: Record<string, number> = {
    start: 523,
    pause: 392,
    complete: 784,
  };
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  osc.frequency.setValueAtTime(tones[type] ?? 440, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

const showNotification = (title: string, body: string, enabled: boolean) => {
  if (!enabled) return;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

const waitForVideoReady = (v: HTMLVideoElement) =>
  new Promise<void>((resolve) => {
    if (v.readyState >= 2 && v.videoWidth > 0) return resolve();
    const onReady = () => {
      v.removeEventListener("loadedmetadata", onReady);
      v.removeEventListener("canplay", onReady);
      resolve();
    };
    v.addEventListener("loadedmetadata", onReady);
    v.addEventListener("canplay", onReady);
  });

// Fallback AI insight generator (unchanged)
const generateAIInsight = (sessionData: {
  focusPercentage: number;
  distractionCount: number;
  duration: number;
  wasCompleted: boolean;
}) => {
  const { focusPercentage, distractionCount, wasCompleted } = sessionData;
  if (!wasCompleted) {
    return {
      summary: "Session ended early",
      insights: [
        "You stopped the session before completion. Try shorter sessions to build momentum.",
        "Clear distractors before starting.",
      ],
      tips: ["2-minute rule", "Remove distractions"],
      score: Math.round(focusPercentage),
      badge: "In Progress",
    };
  }
  if (focusPercentage >= 90) {
    return {
      summary: "Outstanding performance! 🌟",
      insights: [
        `Exceptional focus at ${Math.round(focusPercentage)}%.`,
        `${distractionCount} distractions — great control.`,
      ],
      tips: ["Document what worked", "Repeat same setup/time"],
      score: Math.round(focusPercentage),
      badge: "Elite Focus",
    };
  }
  if (focusPercentage >= 75) {
    return {
      summary: "Great session! 🎯",
      insights: [
        `Strong focus at ${Math.round(focusPercentage)}%.`,
        `${distractionCount} distractions — slightly above ideal.`,
      ],
      tips: ["Use DND", "Phone out of room", "Try website blockers"],
      score: Math.round(focusPercentage),
      badge: "Strong Focus",
    };
  }
  if (focusPercentage >= 60) {
    return {
      summary: "Good effort, room to improve 💪",
      insights: [
        `Moderate focus at ${Math.round(focusPercentage)}%.`,
        "Environment likely needs optimization.",
      ],
      tips: [
        "Shorter sessions",
        "Walk before starting",
        "Noise or brown noise",
      ],
      score: Math.round(focusPercentage),
      badge: "Building Focus",
    };
  }
  return {
    summary: "Challenging session 🔧",
    insights: [
      `Focus at ${Math.round(
        focusPercentage
      )}% suggests significant distractions.`,
      "Try a different time of day or reduce stimuli.",
    ],
    tips: ["Audit workspace", "Body-doubling", "10-min blocks"],
    score: Math.round(focusPercentage),
    badge: "Work in Progress",
  };
};

export function TimerInterface({
  onSessionComplete,
}: {
  onSessionComplete?: () => void;
}) {
  const { settings } = useSettingsContext();

  // Session state
  const [sessionType, setSessionType] = useState<SessionType>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [targetDuration, setTargetDuration] = useState(
    settings.focusDuration * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);

  // Tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focusPercentage, setFocusPercentage] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);
  const [focusedTimeSec, setFocusedTimeSec] = useState(0);
  const [currentTask, setCurrentTask] = useState("");

  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState("");
  const [modalSessionType, setModalSessionType] =
    useState<SessionType>("focus");
  const [recentTasks, setRecentTasks] = useState<string[]>([]);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Detection
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(false);
  const [confidence, setConfidence] = useState(0);

  // Refs
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const visibleVideoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const lastFrameTsRef = useRef<number>(performance.now());
  const lastDistractionRef = useRef<number>(0);
  const lastConfidenceUpdateRef = useRef<number>(0);
  const distractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const initInProgressRef = useRef(false);
  const lastFocusedRef = useRef(false); // NEW: last known focus state

  // Load recent tasks
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentTasks");
      if (stored) setRecentTasks(JSON.parse(stored));
    } catch {}
  }, []);

  // Notifications permission
  useEffect(() => {
    if (settings.desktopNotifications && "Notification" in window) {
      if (Notification.permission === "default")
        Notification.requestPermission();
    }
  }, [settings.desktopNotifications]);

  // Timer tick (now also accumulates focused time)
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        // countdown
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });

        // accumulate focused time based on last known focus state
        if (
          sessionType === "focus" &&
          settings.cameraEnabled &&
          lastFocusedRef.current
        ) {
          setFocusedTimeSec((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (
      settings.previewEnabled &&
      streamRef.current &&
      visibleVideoRef.current &&
      cameraReady
    ) {
      try {
        (visibleVideoRef.current as any).srcObject = streamRef.current;
      } catch {
        visibleVideoRef.current!.src = URL.createObjectURL(
          streamRef.current as any
        );
      }
      visibleVideoRef.current!.play().catch(() => {});
    }
  }, [settings.previewEnabled, cameraReady]);

  // Keep detector options updated
  useEffect(() => {
    try {
      setFaceFocusOptions({
        mirrored: settings.mirrorVideo,
        includeKeypoints: settings.overlayEnabled,
      });
    } catch {}
  }, [settings.mirrorVideo, settings.overlayEnabled]);

  // Draw overlay
  const drawOverlay = useCallback(
    (snap: FaceFocusSnapshot) => {
      if (!settings.previewEnabled || !settings.overlayEnabled) return;
      const videoEl = visibleVideoRef.current;
      const canvas = overlayRef.current;
      if (!videoEl || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = videoEl.clientWidth;
      const h = videoEl.clientHeight;
      if (!w || !h) return;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);

      if (!snap.keypoints || !snap.faceDetected) return;

      const sx = w / snap.sourceW;
      const sy = h / snap.sourceH;

      ctx.fillStyle = snap.isLookingAtScreen
        ? "rgba(34,197,94,0.9)"
        : "rgba(239,68,68,0.9)";
      for (const kp of snap.keypoints) {
        const x = kp.x * sx;
        const y = kp.y * sy;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [settings.previewEnabled, settings.overlayEnabled]
  );

  // Subscribe to snapshots
  const subscribeSnapshots = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeFaceFocus((snap: FaceFocusSnapshot) => {
      setFaceDetected(snap.faceDetected);
      setIsLookingAtScreen(snap.isLookingAtScreen);
      drawOverlay(snap);

      const now = typeof snap.ts === "number" ? snap.ts : performance.now();
      let dt = Math.max(0, (now - lastFrameTsRef.current) / 1000);
      dt = Math.min(dt, 0.5); // clamp spikes
      lastFrameTsRef.current = now;

      if (now - lastConfidenceUpdateRef.current > 1000) {
        setConfidence(snap.confidence);
        lastConfidenceUpdateRef.current = now;
      }

      const meetsConf = (snap.confidence || 0) >= settings.minFocusConfidence;
      const focusedNow =
        snap.faceDetected && snap.isLookingAtScreen && meetsConf;

      if (!isPaused && sessionType === "focus") {
        setFocusPercentage((prev) => {
          const gain = settings.focusGainPerSec;
          const loss = snap.faceDetected
            ? settings.defocusLossPerSec
            : settings.noFaceLossPerSec;
          const delta = focusedNow ? gain * dt : -loss * dt;
          return Math.max(0, Math.min(100, prev + delta));
        });
      }

      // NEW: track last known focus state
      lastFocusedRef.current = focusedNow;

      // Distraction detection (throttle)
      if (!focusedNow && sessionType === "focus") {
        const t = Date.now();
        if (t - lastDistractionRef.current > 5000) {
          lastDistractionRef.current = t;
          setDistractionCount((prev) => prev + 1);
          toast({ title: "Distraction detected" });
        }

        // Auto-pause
        if (
          settings.pauseOnDistraction &&
          isRunning &&
          !isPaused &&
          !distractionTimerRef.current
        ) {
          distractionTimerRef.current = setTimeout(() => {
            setIsPaused(true);
            setPauseReason("auto");
            playSound("pause", settings.soundEnabled);
            toast({ title: "Auto-paused due to distraction" });
            distractionTimerRef.current = null;
          }, settings.distractionThreshold * 1000);
        }
      } else {
        // Clear timer
        if (distractionTimerRef.current) {
          clearTimeout(distractionTimerRef.current);
          distractionTimerRef.current = null;
        }
        // Auto-resume
        if (settings.pauseOnDistraction && isPaused && pauseReason === "auto") {
          setIsPaused(false);
          setPauseReason(null);
          toast({ title: "Auto-resumed" });
        }
      }
    });
  }, [
    drawOverlay,
    isPaused,
    isRunning,
    pauseReason,
    sessionType,
    settings.minFocusConfidence,
    settings.focusGainPerSec,
    settings.defocusLossPerSec,
    settings.noFaceLossPerSec,
    settings.pauseOnDistraction,
    settings.distractionThreshold,
    settings.soundEnabled,
  ]);

  // Init camera
  const initializeCamera = useCallback(async () => {
    if (!settings.cameraEnabled) {
      toast({ title: "Camera tracking is disabled in settings" });
      return false;
    }
    if (initInProgressRef.current) return false;
    initInProgressRef.current = true;

    try {
      const stream = await requestCameraAccess();
      streamRef.current = stream;

      // Hidden video for detector
      const hv = hiddenVideoRef.current;
      if (!hv) throw new Error("Hidden video not mounted");
      try {
        (hv as any).srcObject = stream;
      } catch {
        hv.src = URL.createObjectURL(stream as any);
      }
      hv.muted = true;
      hv.playsInline = true;
      await waitForVideoReady(hv);
      await hv.play();

      // Visible preview (optional)
      const vv = visibleVideoRef.current;
      if (vv && settings.previewEnabled) {
        try {
          (vv as any).srcObject = stream;
        } catch {
          vv.src = URL.createObjectURL(stream as any);
        }
        vv.muted = true;
        vv.playsInline = true;
        await vv.play().catch(() => {});
      }

      await ensureFaceFocus(hv);
      startFaceFocus({
        includeKeypoints: settings.overlayEnabled,
        mirrored: settings.mirrorVideo,
      });
      subscribeSnapshots();

      setCameraReady(true);
      toast({ title: "Camera & detector ready" });
      return true;
    } catch (e: any) {
      console.error(e);
      toast({
        title: e?.message || "Failed to initialize camera",
        variant: "destructive",
      });
      setCameraReady(false);
      return false;
    } finally {
      initInProgressRef.current = false;
    }
  }, [
    settings.cameraEnabled,
    settings.previewEnabled,
    settings.overlayEnabled,
    settings.mirrorVideo,
    subscribeSnapshots,
  ]);

  // AI insights
  const fetchAIInsights = useCallback(
    async (sessionData: {
      focusPercentage: number;
      distractionCount: number;
      duration: number;
      wasCompleted: boolean;
    }) => {
      setIsGeneratingInsight(true);
      if (sessionId) {
        try {
          const resp = await fetch(`/api/sessions/${sessionId}/insight`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionData),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.insight) {
              setAiInsight({
                summary: "AI Analysis",
                insights: [data.insight],
                tips: [],
                score: Math.round(sessionData.focusPercentage),
                badge: "AI Powered",
              });
              setIsGeneratingInsight(false);
              return;
            }
          }
        } catch (e) {
          console.error("Insight fetch failed:", e);
        }
      }
      setAiInsight(generateAIInsight(sessionData));
      setIsGeneratingInsight(false);
    },
    [sessionId]
  );

  const handleShowInsights = () => {
    fetchAIInsights({
      focusPercentage,
      distractionCount,
      duration: targetDuration - timeLeft,
      wasCompleted: timeLeft === 0,
    });
    setIsAIModalOpen(true);
  };

  // Start session (with modal)
  const handleStartClick = () => {
    setModalTask("");
    setModalSessionType("focus");
    setIsModalOpen(true);
  };

  const handleStartSession = async (data: TaskModalData) => {
    setIsModalOpen(false);
    setSessionType(data.sessionType);
    setCurrentTask(data.task || "");

    let duration = settings.focusDuration * 60;
    if (data.sessionType === "shortBreak")
      duration = settings.shortBreakDuration * 60;
    if (data.sessionType === "longBreak")
      duration = settings.longBreakDuration * 60;

    setTargetDuration(duration);
    setTimeLeft(duration);
    setIsRunning(true);
    setIsPaused(false);
    setPauseReason(null);
    setFocusPercentage(100);
    setDistractionCount(0);
    setFocusedTimeSec(0);
    lastFocusedRef.current = false;

    // Save recent task
    if (data.task && data.task.trim()) {
      try {
        const updated = [
          data.task,
          ...recentTasks.filter((t) => t !== data.task),
        ].slice(0, 5);
        setRecentTasks(updated);
        localStorage.setItem("recentTasks", JSON.stringify(updated));
      } catch {}
    }

    // Camera
    if (data.sessionType === "focus" && settings.cameraEnabled) {
      await initializeCamera();
    }

    playSound("start", settings.soundEnabled);
    showNotification(
      "Session Started",
      `${data.sessionType === "focus" ? "Focus" : "Break"} — ${
        data.task || "No task"
      }`,
      settings.desktopNotifications
    );

    // Create session in backend
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDuration: duration / 60,
          sessionType: data.sessionType === "focus" ? "focus" : "break",
          cameraEnabled: settings.cameraEnabled && data.sessionType === "focus",
          task: data.task || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const result = await res.json();
      setSessionId(result.session._id);
    } catch (err) {
      console.error("❌ Session creation failed:", err);
      toast({ title: "Failed to start session", variant: "destructive" });
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setPauseReason("manual");
    playSound("pause", settings.soundEnabled);
    toast({ title: "Session paused" });
    if (distractionTimerRef.current) {
      clearTimeout(distractionTimerRef.current);
      distractionTimerRef.current = null;
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    setPauseReason(null);
    playSound("start", settings.soundEnabled);
    toast({ title: "Session resumed" });
  };

  // STOP HANDLER – now accepts { completed?: boolean }
  const handleStop = async (options?: { completed?: boolean }) => {
    const forcedCompleted = options?.completed ?? false;
    const wasCompleted = forcedCompleted || timeLeft === 0;

    const durationSec = wasCompleted
      ? targetDuration
      : targetDuration - timeLeft;

    setIsRunning(false);
    setIsPaused(false);
    setPauseReason(null);
    lastFocusedRef.current = false;

    // Stop detection
    stopFaceFocus();
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    await cleanupFaceDetection();

    if (distractionTimerRef.current) {
      clearTimeout(distractionTimerRef.current);
      distractionTimerRef.current = null;
    }

    // Persist session
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration: durationSec,
            focusedTime: Math.round(focusedTimeSec),
            focusPercentage,
            distractionCount,
            isCompleted: wasCompleted,
            endTime: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error("❌ Failed to save session:", e);
      }
    }

    // Post-session insights
    if (wasCompleted && sessionType === "focus") {
      fetchAIInsights({
        focusPercentage,
        distractionCount,
        duration: durationSec,
        wasCompleted: true,
      });
      setIsAIModalOpen(true);
    }

    setSessionId(null);

    // Pomodoro auto cycle
    if (wasCompleted && sessionType === "focus") {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if (settings.autoStartBreaks) {
        setTimeout(() => {
          if (newCount % 4 === 0) {
            handleStartSession({
              task: "Long Break",
              sessionType: "longBreak",
            });
          } else {
            handleStartSession({
              task: "Short Break",
              sessionType: "shortBreak",
            });
          }
        }, 3000);
      }
    } else if (wasCompleted && sessionType !== "focus") {
      if (settings.autoStartPomodoros) {
        setTimeout(() => handleStartClick(), 3000);
      }
    }

    toast({ title: wasCompleted ? "Session completed!" : "Session ended" });
  };

  const handleSessionComplete = () => {
    playSound("complete", settings.soundEnabled);
    showNotification(
      "Session Complete! 🎉",
      `You completed a ${sessionType} session!`,
      settings.desktopNotifications
    );
    // Mark as completed so history/analytics see it
    handleStop({ completed: true });
    onSessionComplete?.();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        stopFaceFocus();
      } catch {}
      try {
        if (unsubRef.current) unsubRef.current();
      } catch {}
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (distractionTimerRef.current) {
        clearTimeout(distractionTimerRef.current);
        distractionTimerRef.current = null;
      }
      cleanupFaceDetection().catch(() => {});
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  const progress =
    targetDuration > 0
      ? ((targetDuration - timeLeft) / targetDuration) * 100
      : 0;

  const getSessionStyle = () => {
    switch (sessionType) {
      case "focus":
        return {
          color: "text-primary",
          bg: "bg-primary/10",
          border: "border-primary/50",
          icon: Target,
          label: "Focus Session",
        };
      case "shortBreak":
        return {
          color: "text-green-500",
          bg: "bg-green-500/10",
          border: "border-green-500/50",
          icon: Coffee,
          label: "Short Break",
        };
      case "longBreak":
        return {
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          border: "border-blue-500/50",
          icon: Coffee,
          label: "Long Break",
        };
    }
  };
  const sessionStyle = getSessionStyle()!;
  const SessionIcon = sessionStyle.icon;

  return (
    <>
      {/* Hidden video for detector */}
      <div className="sr-only pointer-events-none absolute -z-50">
        <video ref={hiddenVideoRef} autoPlay playsInline muted />
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Camera Preview (re-enabled) */}
        <AnimatePresence mode="wait">
          {isRunning &&
            sessionType === "focus" &&
            settings.cameraEnabled &&
            cameraReady &&
            settings.previewEnabled && (
              <motion.div
                key="camera-preview"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mx-auto overflow-hidden rounded-lg border"
                style={{ maxWidth: 640 }}
              >
                <video
                  ref={visibleVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full",
                    settings.mirrorVideo && "transform -scale-x-100"
                  )}
                />
                {settings.overlayEnabled && (
                  <canvas
                    ref={overlayRef}
                    className={cn(
                      "pointer-events-none absolute inset-0 h-full w-full",
                      settings.mirrorVideo && "transform -scale-x-100"
                    )}
                  />
                )}

                <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
                  <Badge
                    variant={
                      faceDetected && isLookingAtScreen
                        ? "default"
                        : "destructive"
                    }
                    className="gap-1.5"
                  >
                    {faceDetected ? (
                      isLookingAtScreen ? (
                        <>
                          <Eye className="h-3 w-3" /> Focused
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" /> Looking Away
                        </>
                      )
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3" /> No Face
                      </>
                    )}
                  </Badge>
                  <Badge variant="secondary">
                    {Math.round(confidence)}% confidence
                  </Badge>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Status Card */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={cn("transition-colors", sessionStyle.border)}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        sessionStyle.bg
                      )}
                    >
                      <SessionIcon
                        className={cn("h-5 w-5", sessionStyle.color)}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{sessionStyle.label}</p>
                      {currentTask && (
                        <p className="text-sm text-muted-foreground">
                          {currentTask}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {sessionType === "focus" && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {Math.round(focusPercentage)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">
                            {distractionCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="font-medium">
                            {formatTime(focusedTimeSec)}
                          </span>
                        </div>
                      </div>
                    )}

                    {sessionType === "focus" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowInsights}
                        className="gap-2"
                      >
                        <Brain className="h-4 w-4" /> AI Insights
                      </Button>
                    )}

                    {isPaused && (
                      <Badge variant="destructive">
                        Paused {pauseReason === "auto" && "(Auto)"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Timer Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8 text-center"
        >
          {/* Pomodoro Progress */}
          {pomodoroCount > 0 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-3 w-3 rounded-full transition-colors",
                    i < pomodoroCount % 4
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  )}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {pomodoroCount} completed
              </span>
            </div>
          )}

          {/* Timer circle */}
          <div className="relative inline-block">
            <div
              className={cn(
                "mx-auto flex h-80 w-80 items-center justify-center rounded-full border-8 shadow-2xl transition-colors",
                sessionStyle.bg,
                sessionStyle.border
              )}
            >
              <div className="text-center">
                <motion.div
                  className={cn(
                    "font-mono text-7xl font-bold",
                    sessionStyle.color
                  )}
                  animate={{ scale: isRunning && !isPaused ? [1, 1.02, 1] : 1 }}
                  transition={{
                    duration: 2,
                    repeat: isRunning && !isPaused ? Infinity : 0,
                  }}
                >
                  {formatTime(timeLeft)}
                </motion.div>
                <div className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">
                  {isRunning
                    ? isPaused
                      ? "Paused"
                      : sessionStyle.label
                    : "Ready"}
                </div>
              </div>
            </div>

            <svg
              className="pointer-events-none absolute inset-0 mx-auto h-80 w-80 -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={cn(
                  sessionStyle.color,
                  "transition-all duration-1000"
                )}
                strokeDasharray="282.7"
                strokeDashoffset={282.7 - (282.7 * progress) / 100}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isRunning ? (
              <Button
                onClick={handleStartClick}
                size="lg"
                className="gap-2 px-8"
              >
                <Play className="h-5 w-5" /> Start Session
              </Button>
            ) : (
              <>
                <Button
                  onClick={isPaused ? handleResume : handlePause}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-5 w-5" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5" /> Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleStop()}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <Square className="h-5 w-5" /> End Session
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        {isRunning && sessionType === "focus" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <StatCard
              label="Focus Score"
              value={`${Math.round(focusPercentage)}%`}
              icon={Sparkles}
              color="text-primary"
              showProgress
              progressValue={focusPercentage}
            />
            <StatCard
              label="Distractions"
              value={distractionCount}
              icon={AlertTriangle}
              color="text-amber-500"
            />
            <StatCard
              label="Focused Time"
              value={formatTime(focusedTimeSec)}
              icon={Clock}
              color="text-green-500"
            />
          </motion.div>
        )}
      </div>

      {/* Start Session Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Start New Session
            </DialogTitle>
            <DialogDescription>
              Choose your session type and optionally add a task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select
                value={modalSessionType}
                onValueChange={(v) => setModalSessionType(v as SessionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" /> Focus (
                      {settings.focusDuration} min)
                    </div>
                  </SelectItem>
                  <SelectItem value="shortBreak">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" /> Short Break (
                      {settings.shortBreakDuration} min)
                    </div>
                  </SelectItem>
                  <SelectItem value="longBreak">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" /> Long Break (
                      {settings.longBreakDuration} min)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task">What are you working on?</Label>
              <Input
                id="task"
                value={modalTask}
                onChange={(e) => setModalTask(e.target.value)}
                placeholder="e.g., Complete project report"
                className="w-full"
              />
            </div>

            {recentTasks.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <History className="h-3 w-3" /> Recent Tasks
                </Label>
                <div className="flex flex-wrap gap-2">
                  {recentTasks.map((task, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setModalTask(task)}
                    >
                      {task}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {modalSessionType === "focus" && !settings.cameraEnabled && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Camera tracking is disabled in settings
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleStartSession({
                  task: modalTask.trim(),
                  sessionType: modalSessionType,
                })
              }
            >
              <Play className="mr-2 h-4 w-4" /> Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Insights Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> AI Session Insights
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAIModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Personalized coaching based on your session performance
            </DialogDescription>
          </DialogHeader>

          {isGeneratingInsight ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Brain className="mb-4 h-12 w-12 animate-pulse text-primary" />
              <p className="text-muted-foreground">Analyzing your session...</p>
            </div>
          ) : aiInsight ? (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl font-bold text-primary">
                      {aiInsight.score}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{aiInsight.summary}</p>
                    <Badge variant="secondary">{aiInsight.badge}</Badge>
                  </div>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Key Insights</h4>
                </div>
                <ul className="space-y-2">
                  {aiInsight.insights.map((ins: string, i: number) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 text-primary">•</span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {aiInsight.tips?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold">Actionable Tips</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiInsight.tips.map((tip: string, i: number) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm"
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No insights yet. Complete a session to get personalized coaching.
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsAIModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  showProgress,
  progressValue,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <Icon className={cn("h-5 w-5", color)} />
          <div className={cn("text-3xl font-bold", color)}>{value}</div>
        </div>
        <div className="mb-2 text-sm text-muted-foreground">{label}</div>
        {showProgress && typeof progressValue === "number" && (
          <Progress value={progressValue} className="h-1.5" />
        )}
      </CardContent>
    </Card>
  );
}
