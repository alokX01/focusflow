"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Eye, EyeOff, Settings } from "lucide-react";
import { CameraSetup } from "@/components/camera-setup";
import { BreakReminderModal } from "@/components/break-reminder-modal";
import { useFocusSession } from "@/hooks/use-focus-session";
import { useSettings } from "@/hooks/use-settings";

export function TimerInterface() {
  const {
    session,
    isRunning,
    isPaused,
    timeRemaining,
    focusPercentage,
    distractionCount,
    isLookingAtScreen,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addDistraction,
    updateFocusPercentage,
    loading,
    error
  } = useFocusSession();

  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMesh = useRef<any>(null); // To store the loaded model

  const [showCameraSetup, setShowCameraSetup] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakType, setBreakType] = useState<"short" | "long" | "eye-strain">(
    "short"
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartTimer = async () => {
    if (!settings?.cameraEnabled) {
      setShowCameraSetup(true);
      return;
    }
    
    const targetDuration = settings?.focusDuration || 25;
    await startSession(targetDuration, settings?.cameraEnabled || false);
  };

  const handlePauseTimer = async () => {
    if (isPaused) {
      await resumeSession();
    } else {
      await pauseSession();
    }
  };

  const handleStopTimer = async () => {
    await stopSession();
  };

  const handleCameraSetupComplete = async () => {
    setShowCameraSetup(false);
    const targetDuration = settings?.focusDuration || 25;
    await startSession(targetDuration, true);
  };

  const handleBreakComplete = () => {
    setShowBreakModal(false);
  };

  // Define the type for a keypoint for better TypeScript support
  type Keypoint = {
    x: number;
    y: number;
    z?: number;
    name?: string;
  };

  // Updated helper function
  function checkIfLookingAtScreen(keypoints: Keypoint[]): boolean {
    // These keypoint indices are the same, but we access them differently
    const nose = keypoints[4];
    const leftEye = keypoints[130];
    const rightEye = keypoints[359];
    const chin = keypoints[152];

    // The logic remains the same, but we access properties like .x and .y
    const horizontalDistLeft = Math.abs(nose.x - leftEye.x);
    const horizontalDistRight = Math.abs(nose.x - rightEye.x);
    const horizontalRatio = horizontalDistLeft / horizontalDistRight;

    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const verticalDistEyeNose = Math.abs(eyeCenterY - nose.y);
    const verticalDistNoseChin = Math.abs(nose.y - chin.y);
    const verticalRatio = verticalDistEyeNose / verticalDistNoseChin;

    const isHorizontallyCentered =
      horizontalRatio > 0.6 && horizontalRatio < 1.4;
    const isVerticallyCentered = verticalRatio < 0.8;

    return isHorizontallyCentered && isVerticallyCentered;
  }
  // Handle session completion
  useEffect(() => {
    if (timeRemaining === 0 && isRunning && session) {
      setShowBreakModal(true);
      setBreakType("short");
    }
  }, [timeRemaining, isRunning, session]);

  // useEffect for real-time face detection
  useEffect(() => {
    // We need a variable to track the animation frame loop
    let animationFrameId: number;

    const loadAndRunModel = async () => {
      // Dynamically import the libraries
      const faceLandmarksDetection = await import(
        "@tensorflow-models/face-landmarks-detection"
      );
      const tf = await import("@tensorflow/tfjs");
      await tf.setBackend("webgl");

      // Load the model using the new createDetector API
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig = {
        runtime: "mediapipe",
        // This path is crucial for the model to load its assets
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        maxFaces: 1,
      };
      faceMesh.current = await faceLandmarksDetection.createDetector(
        model,
        detectorConfig
      );

      // Setup the webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      // Start the detection loop
      detectFocus();
    };

    const detectFocus = async () => {
      // Ensure the detector and video are ready
      if (
        faceMesh.current &&
        videoRef.current &&
        videoRef.current.readyState === 4
      ) {
        const predictions = await faceMesh.current.estimateFaces(
          videoRef.current
        );

        if (predictions.length > 0) {
          // We found a face! Now check the head pose.
          const keypoints = predictions[0].keypoints;
          const isLooking = checkIfLookingAtScreen(keypoints);
          
          // Update focus percentage based on looking at screen
          if (!isLooking && isLookingAtScreen) {
            // User looked away, add distraction
            addDistraction('looked-away', 1, 'Looked away from screen');
          }
          
          // Update focus percentage (simplified calculation)
          const newFocusPercentage = isLooking ? Math.min(100, focusPercentage + 0.1) : Math.max(0, focusPercentage - 0.5);
          updateFocusPercentage(newFocusPercentage);
        }
      }
      // Loop this function
      animationFrameId = requestAnimationFrame(detectFocus);
    };

    if (isRunning && session?.cameraEnabled) {
      loadAndRunModel();
    }

    // Cleanup function to stop the loop when the component unmounts or the timer stops
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, session?.cameraEnabled, addDistraction, updateFocusPercentage, focusPercentage, isLookingAtScreen]);
  
  const progress = session ? ((session.targetDuration - timeRemaining) / session.targetDuration) * 100 : 0;

  if (showCameraSetup) {
    return <CameraSetup onSetupComplete={handleCameraSetupComplete} />;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading session...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <div className="text-lg text-destructive">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Add this hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-0 h-0 absolute" // Hides the video from view
      />
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Camera Status */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isLookingAtScreen ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              />
              <span className="text-sm text-muted-foreground">
                Camera Status:
              </span>
              <Badge
                variant={
                  session?.cameraEnabled
                    ? isLookingAtScreen
                      ? "default"
                      : "destructive"
                    : "secondary"
                }
                className="gap-1"
              >
                {session?.cameraEnabled ? (
                  <>
                    {isLookingAtScreen ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    {isLookingAtScreen ? "Focused" : "Distracted"}
                  </>
                ) : (
                  <>
                    <Settings className="w-3 h-3" />
                    Setup Required
                  </>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Focus:{" "}
                <span className="text-primary font-medium">
                  {Math.round(focusPercentage)}%
                </span>
              </div>
              {!session?.cameraEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCameraSetup(true)}
                  className="gap-2"
                >
                  <Settings className="w-3 h-3" />
                  Setup Camera
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Main Timer */}
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="w-80 h-80 mx-auto rounded-full border-8 border-border bg-card/30 backdrop-blur-sm flex items-center justify-center focus-glow">
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-foreground mb-2">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">
                  {isRunning
                    ? isPaused
                      ? "Paused"
                      : "Focus Time"
                    : "Ready"}
                </div>
              </div>
            </div>

            {/* Progress Ring */}
            <svg
              className="absolute inset-0 w-80 h-80 mx-auto -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray={`${progress * 2.827} 282.7`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRunning ? (
              <Button onClick={handleStartTimer} size="lg" className="gap-2" disabled={loading}>
                <Play className="w-5 h-5" />
                Start Focus Session
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePauseTimer}
                  variant="outline"
                  size="lg"
                  className="gap-2 bg-transparent"
                  disabled={loading}
                >
                  {isPaused ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  onClick={handleStopTimer}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                  disabled={loading}
                >
                  <Square className="w-5 h-5" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">
                {Math.round(focusPercentage)}%
              </div>
              <div className="text-sm text-muted-foreground">Focus Score</div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500 mb-1">
                {distractionCount}
              </div>
              <div className="text-sm text-muted-foreground">Distractions</div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {session ? formatTime(session.targetDuration - timeRemaining) : "00:00"}
              </div>
              <div className="text-sm text-muted-foreground">Time Focused</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Break Reminder Modal */}
      <BreakReminderModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onStartBreak={handleBreakComplete}
        breakType={breakType}
      />
    </>
  );
}
