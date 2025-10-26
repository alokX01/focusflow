"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  Camera,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  requestCameraAccess,
  ensureFaceFocus,
  startFaceFocus,
  stopFaceFocus,
  subscribeFaceFocus,
  cleanupFaceDetection,
  getFaceDetectionRuntime,
  type FaceFocusSnapshot,
} from "@/lib/face-detection";

type PauseReason = null | "manual" | "auto";

export function TimerInterface({
  onSessionComplete,
}: {
  onSessionComplete?: () => void;
}) {
  // Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [targetDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focusPercentage, setFocusPercentage] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);
  const [focusedTimeSec, setFocusedTimeSec] = useState(0);

  // Detection + UI metrics
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [runtime, setRuntime] = useState<"mediapipe" | "tfjs" | "unknown">(
    "unknown"
  );
  const [resolution, setResolution] = useState("0×0");
  const [lastDistractionAt, setLastDistractionAt] = useState<string | null>(
    null
  );

  // UI toggles
  const [autoPauseOnDistraction, setAutoPauseOnDistraction] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);
  const lastFrameTsRef = useRef<number>(performance.now());
  const lastDistractionRef = useRef<number>(0);
  const initInProgressRef = useRef(false);

  // Timer tick
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, isPaused]);

  // Subscribe to face focus snapshots
  const subscribeSnapshots = () => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeFaceFocus((snap: FaceFocusSnapshot) => {
      // Update metrics
      setRuntime(snap.runtime);
      if (snap.fps) setFps(snap.fps);
      setFaceDetected(snap.faceDetected);
      setIsLookingAtScreen(snap.isLookingAtScreen);
      setConfidence(snap.confidence);
      setResolution(`${snap.sourceW}×${snap.sourceH}`);

      // Draw overlay if requested (video is mirrored; overlay is mirrored via CSS)
      if (showOverlay) {
        drawOverlay(snap);
      }

      // Focus score and focused time only while not paused
      const now = snap.ts;
      const dt = Math.max(0, (now - lastFrameTsRef.current) / 1000);
      lastFrameTsRef.current = now;

      const focusedNow = snap.faceDetected && snap.isLookingAtScreen;

      if (!isPaused) {
        setFocusPercentage((prev) => {
          const delta = focusedNow ? +1 * dt : -4 * dt;
          return Math.max(0, Math.min(100, prev + delta));
        });
        if (focusedNow) setFocusedTimeSec((prev) => prev + dt);
      }

      // Distraction handling (throttled)
      if (!focusedNow) {
        const t = Date.now();
        if (t - lastDistractionRef.current > 3000) {
          lastDistractionRef.current = t;
          setDistractionCount((prev) => prev + 1);
          setLastDistractionAt(new Date().toLocaleTimeString());
          toast.warning("Distraction detected", { duration: 900 });
          // Auto pause/resume
          if (autoPauseOnDistraction && isRunning && !isPaused) {
            setIsPaused(true);
            setPauseReason("auto");
            toast.message("Auto paused");
          }
        }
      } else if (autoPauseOnDistraction && isPaused && pauseReason === "auto") {
        setIsPaused(false);
        setPauseReason(null);
        toast.message("Auto resumed");
      }
    });
  };

  const drawOverlay = (snap: FaceFocusSnapshot) => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // match overlay to displayed size
    const w = video.clientWidth;
    const h = video.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    if (!snap.keypoints || !snap.faceDetected) return;

    const sx = w / snap.sourceW;
    const sy = h / snap.sourceH;

    ctx.fillStyle = "rgba(99,102,241,0.9)";
    for (const kp of snap.keypoints) {
      const x = kp.x * sx;
      const y = kp.y * sy;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Start session
  const handleStart = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setPauseReason(null);
    setTimeLeft(targetDuration);
    setFocusPercentage(100);
    setDistractionCount(0);
    setFocusedTimeSec(0);
    setLastDistractionAt(null);

    // Camera
    try {
      if (!initInProgressRef.current) {
        initInProgressRef.current = true;
        const stream = await requestCameraAccess();
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        await v.play();
        setCameraReady(true);
        await ensureFaceFocus(v);
        startFaceFocus({ includeKeypoints: true });
        subscribeSnapshots();
        setRuntime(getFaceDetectionRuntime());
        toast.success("Camera & detector ready");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Camera init failed");
      setCameraReady(false);
    } finally {
      initInProgressRef.current = false;
    }

    // Create session
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDuration: targetDuration / 60,
          sessionType: "focus",
          cameraEnabled: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.session._id);
    } catch (err) {
      console.error("❌ Session creation failed:", err);
      toast.error("Failed to start session");
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setPauseReason("manual");
    toast.info("Session paused");
  };

  const handleResume = () => {
    setIsPaused(false);
    setPauseReason(null);
    toast.info("Session resumed");
  };

  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setPauseReason(null);

    // stop detection
    stopFaceFocus();
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    await cleanupFaceDetection();

    // save session
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration: targetDuration - timeLeft,
            focusedTime: Math.round(focusedTimeSec),
            focusPercentage,
            distractionCount,
            isCompleted: timeLeft === 0,
            endTime: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error("❌ Failed to save session:", e);
      }
    }

    // reset UI
    setTimeLeft(targetDuration);
    setFocusPercentage(100);
    setDistractionCount(0);
    setFocusedTimeSec(0);
    setSessionId(null);

    toast.success("Session ended");
  };

  const handleSessionComplete = () => {
    handleStop();
    onSessionComplete?.();
  };

  // Cleanup on unmount (including Fast Refresh)
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
  const progress = ((targetDuration - timeLeft) / targetDuration) * 100;

  return (
    <>
      {/* Top bar */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={autoPauseOnDistraction ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoPauseOnDistraction((s) => !s)}
            >
              {autoPauseOnDistraction ? "Auto Pause: ON" : "Auto Pause: OFF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((s) => !s)}
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
            <Button
              variant={showOverlay ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOverlay((s) => !s)}
            >
              {showOverlay ? "Overlay: ON" : "Overlay: OFF"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Badge variant="secondary">runtime: {runtime}</Badge>
            <Badge variant="secondary">
              fps: <Activity className="w-3 h-3 mr-1" />
              {fps}
            </Badge>
            <Badge variant="secondary">src: {resolution}</Badge>
          </div>
        </div>

        {/* Preview (mirrored) */}
        <div
          className={cn("relative mx-auto", showPreview ? "block" : "hidden")}
          style={{ maxWidth: 720 }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-md border "
          />
          {showOverlay && (
            <canvas
              ref={overlayRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-md transform -scale-x-100"
            />
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 mt-4">
        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            className={cn(
              "transition-colors",
              isRunning &&
                !isLookingAtScreen &&
                "border-destructive/50 bg-destructive/5"
            )}
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      cameraReady
                        ? isLookingAtScreen && faceDetected
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500 animate-pulse"
                        : "bg-gray-400"
                    )}
                  />
                  <span className="text-sm font-medium">Camera Status:</span>
                  <Badge
                    variant={
                      cameraReady
                        ? isLookingAtScreen && faceDetected
                          ? "default"
                          : "destructive"
                        : "secondary"
                    }
                    className="gap-1"
                  >
                    {cameraReady ? (
                      faceDetected ? (
                        isLookingAtScreen ? (
                          <>
                            <Eye className="w-3 h-3" /> Focused
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Looking Away
                          </>
                        )
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> No Face
                        </>
                      )
                    ) : (
                      <>
                        <Camera className="w-3 h-3 animate-spin" />
                        Initializing...
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    confidence:{" "}
                    <span className="font-medium">
                      {Math.round(confidence)}%
                    </span>
                  </span>
                  <span>
                    distractions:{" "}
                    <span className="font-medium">{distractionCount}</span>
                  </span>
                  <span>
                    last:{" "}
                    <span className="font-medium">
                      {lastDistractionAt || "—"}
                    </span>
                  </span>
                  {isPaused && (
                    <Badge variant="destructive">
                      paused {pauseReason === "auto" ? "(auto)" : "(manual)"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    focus score:{" "}
                    <span className="text-primary font-medium">
                      {Math.round(focusPercentage)}%
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8"
        >
          <div className="relative inline-block">
            <div className="w-80 h-80 mx-auto rounded-full border-8 border-border bg-card/30 backdrop-blur-sm flex items-center justify-center shadow-2xl">
              <div className="text-center">
                <motion.div
                  className="text-7xl font-mono font-bold"
                  animate={{ scale: isRunning && !isPaused ? [1, 1.02, 1] : 1 }}
                  transition={{
                    duration: 2,
                    repeat: isRunning && !isPaused ? Infinity : 0,
                  }}
                >
                  {formatTime(timeLeft)}
                </motion.div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider mt-2">
                  {isRunning ? (isPaused ? "Paused" : "Focus Time") : "Ready"}
                </div>
              </div>
            </div>

            {/* Progress ring */}
            <svg
              className="absolute inset-0 w-80 h-80 mx-auto -rotate-90 pointer-events-none"
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
                className="text-primary transition-all duration-1000"
                strokeDasharray="282.7"
                strokeDashoffset={282.7 - (282.7 * progress) / 100}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isRunning ? (
              <Button onClick={handleStart} size="lg" className="gap-2 px-8">
                <Play className="w-5 h-5" />
                Start Focus Session
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
                      <Play className="w-5 h-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <StatCard
              label="Focus Score"
              value={`${Math.round(focusPercentage)}%`}
              color="text-green-500"
              showProgress
              progressValue={focusPercentage}
            />
            <StatCard
              label="Distractions"
              value={distractionCount}
              color="text-amber-500"
            />
            <StatCard
              label="Time Focused"
              value={formatTime(focusedTimeSec)}
              color="text-primary"
            />
          </motion.div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
  showProgress,
  progressValue,
}: {
  label: string;
  value: string | number;
  color: string;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className={cn("text-3xl font-bold mb-1", color)}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {showProgress && typeof progressValue === "number" && (
          <Progress value={progressValue} className="h-1 mt-3" />
        )}
      </CardContent>
    </Card>
  );
}
