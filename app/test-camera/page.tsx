"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, XCircle } from "lucide-react";

export default function TestCameraPage() {
  const [status, setStatus] = useState<string>("Not started");
  const [logs, setLogs] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const log = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testCamera = async () => {
    try {
      setStatus("Requesting camera...");
      log("📹 Requesting camera access...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      log("✅ Camera access granted!");
      setStream(mediaStream);
      setStatus("Camera active");

      // Display video
      const video = document.getElementById("testVideo") as HTMLVideoElement;
      if (video) {
        video.srcObject = mediaStream;
        await video.play();
        log("✅ Video playing");
      }
    } catch (error: any) {
      log(`❌ Camera error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
    }
  };

  const testFaceDetection = async () => {
    try {
      setStatus("Loading TensorFlow...");
      log("📦 Loading TensorFlow.js...");

      const [tf, faceLandmarksDetection] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/face-landmarks-detection"),
      ]);

      log("✅ TensorFlow loaded");

      setStatus("Setting backend...");
      await tf.setBackend("webgl");
      await tf.ready();
      log(`✅ Backend set: ${tf.getBackend()}`);

      setStatus("Loading face detection model...");
      log("🧠 Loading MediaPipe Face Mesh...");

      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detector = await faceLandmarksDetection.createDetector(model, {
        runtime: "mediapipe",
        refineLandmarks: false,
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        maxFaces: 1,
      });

      log("✅ Face detection model loaded!");
      setStatus("Model ready!");

      // Test detection
      const video = document.getElementById("testVideo") as HTMLVideoElement;
      if (video && video.readyState === 4) {
        log("🔍 Testing face detection...");
        const faces = await detector.estimateFaces(video, {
          flipHorizontal: false,
        });

        if (faces.length > 0) {
          log(`✅ Face detected! ${faces[0].keypoints.length} keypoints found`);
          setStatus(
            `SUCCESS: Face detected with ${faces[0].keypoints.length} points`
          );
        } else {
          log("⚠️ No face detected in frame");
          setStatus("No face in frame");
        }
      }
    } catch (error: any) {
      log(`❌ Face detection error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      console.error("Full error:", error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setStatus("Camera stopped");
      log("🛑 Camera stopped");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Camera & Face Detection Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge
              variant={status.includes("Error") ? "destructive" : "default"}
            >
              {status}
            </Badge>
          </div>

          {/* Video Preview */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              id="testVideo"
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <p>Camera preview will appear here</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button onClick={testCamera} disabled={!!stream}>
              1. Test Camera
            </Button>
            <Button
              onClick={testFaceDetection}
              disabled={!stream}
              variant="outline"
            >
              2. Test Face Detection
            </Button>
            <Button
              onClick={stopCamera}
              disabled={!stream}
              variant="destructive"
            >
              Stop
            </Button>
          </div>

          {/* Logs */}
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p>Console logs will appear here...</p>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">📝 Test Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "1. Test Camera" and allow camera access</li>
              <li>Once video appears, click "2. Test Face Detection"</li>
              <li>Check the console logs for any errors</li>
              <li>Paste all logs here if issues occur</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
