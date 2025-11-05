"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  Eye,
  Loader2,
  XCircle,
  Info,
} from "lucide-react";
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
import { toast } from "sonner";

interface CameraSetupProps {
  onSetupComplete?: () => void;
}

type SetupStep = "permission" | "testing" | "complete";

export function CameraSetup({ onSetupComplete }: CameraSetupProps) {
  const [step, setStep] = useState<SetupStep>("permission");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const unsubRef = useRef<null | (() => void)>(null);
  const testingRef = useRef(false);

  // Stop camera helper
  const stopCameraStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      try {
        stopFaceFocus();
      } catch {}
      stopCameraStream(cameraStream);
      cleanupFaceDetection().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request camera + start a short detection test
  const handleRequestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request camera stream
      const stream = await requestCameraAccess();
      setCameraStream(stream);

      // Attach stream to video
      const v = videoRef.current;
      if (!v) throw new Error("Video element not available");
      try {
        (v as any).srcObject = stream;
      } catch {
        v.src = URL.createObjectURL(stream as any);
      }
      v.muted = true;
      v.playsInline = true;
      await v.play();

      // Init detector + start stream snapshots
      await ensureFaceFocus(v);
      // Optional: configure mirrored input and disable keypoints for this simple test
      setFaceFocusOptions({ mirrored: true, includeKeypoints: false });
      startFaceFocus({ includeKeypoints: false, mirrored: true });

      // Begin test phase
      setStep("testing");
      runTest();
      toast.success("Camera enabled!");
    } catch (err: any) {
      const msg = err?.message || "Failed to enable camera";
      setError(msg);
      toast.error(msg);
      stopCameraStream(cameraStream);
      setCameraStream(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to snapshots, count a fixed number and finish
  const runTest = () => {
    testingRef.current = true;
    let detectionCount = 0;
    const maxDetections = 50; // ~50 frames

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    unsubRef.current = subscribeFaceFocus((snap: FaceFocusSnapshot) => {
      // Only proceed during testing step
      if (!testingRef.current || step !== "testing") return;

      setFaceDetected(snap.faceDetected);
      setIsLookingAtScreen(snap.isLookingAtScreen);

      detectionCount += 1;
      setTestProgress((detectionCount / maxDetections) * 100);

      if (detectionCount >= maxDetections) {
        // Stop testing, keep stream active until user clicks Start Focus
        testingRef.current = false;
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
        // We can stop detection to save resources; stream still plays
        try {
          stopFaceFocus();
        } catch {}
        setStep("complete");
        toast.success("Camera setup complete! 🎉");
      }
    });
  };

  // Complete setup
  const handleComplete = () => {
    // Cleanup detection and camera; then notify parent
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    try {
      stopFaceFocus();
    } catch {}
    stopCameraStream(cameraStream);
    setCameraStream(null);
    cleanupFaceDetection().catch(() => {});
    onSetupComplete?.();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Camera Setup</CardTitle>
                <CardDescription>
                  Enable camera for focus tracking
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera Preview */}
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Face Detection Overlay */}
              {step === "testing" && (
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge
                    variant={faceDetected ? "default" : "secondary"}
                    className="gap-2"
                  >
                    {faceDetected ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Face Detected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        No Face
                      </>
                    )}
                  </Badge>

                  <Badge
                    variant={isLookingAtScreen ? "default" : "destructive"}
                    className="gap-2"
                  >
                    {isLookingAtScreen ? (
                      <>
                        <Eye className="w-3 h-3" />
                        Looking at Screen
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        Looking Away
                      </>
                    )}
                  </Badge>
                </div>
              )}

              {/* No Camera State */}
              {!cameraStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Camera preview will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Test Progress */}
            {step === "testing" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Testing camera...
                  </span>
                  <span className="font-medium">
                    {Math.round(testProgress)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${testProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {step === "permission" && (
                  <>
                    Click "Enable Camera" to allow camera access for focus
                    tracking.
                  </>
                )}
                {step === "testing" && (
                  <>
                    Look at the screen and keep your face in view while we test
                    the detection.
                  </>
                )}
                {step === "complete" && (
                  <>
                    Camera setup complete! You can now start your focus session.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {step === "permission" && (
                <Button
                  onClick={handleRequestPermission}
                  disabled={isLoading}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Enable Camera
                    </>
                  )}
                </Button>
              )}

              {step === "testing" && (
                <Button
                  onClick={() => {
                    // Stop test early
                    testingRef.current = false;
                    if (unsubRef.current) {
                      unsubRef.current();
                      unsubRef.current = null;
                    }
                    try {
                      stopFaceFocus();
                    } catch {}
                    setStep("complete");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Skip Test
                </Button>
              )}

              {step === "complete" && (
                <Button
                  onClick={handleComplete}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  Start Focus Session
                </Button>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-sm font-medium">Privacy & Security</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>All processing happens locally on your device</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>No video data is ever transmitted or stored</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>You can disable camera tracking anytime</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
