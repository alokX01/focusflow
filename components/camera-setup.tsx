"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CheckCircle, AlertTriangle, Settings, Eye, Target, Zap } from "lucide-react"


interface CameraSetupProps {
  onSetupComplete?: () => void
}

export function CameraSetup({ onSetupComplete }: CameraSetupProps) {
  const [cameraStatus, setCameraStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle")
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [gazeAccuracy, setGazeAccuracy] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const calibrationSteps = [
    { title: "Look at the center", description: "Keep your eyes on the center dot", position: { x: 50, y: 50 } },
    { title: "Look top-left", description: "Move your gaze to the top-left corner", position: { x: 20, y: 20 } },
    { title: "Look top-right", description: "Move your gaze to the top-right corner", position: { x: 80, y: 20 } },
    { title: "Look bottom-left", description: "Move your gaze to the bottom-left corner", position: { x: 20, y: 80 } },
    {
      title: "Look bottom-right",
      description: "Move your gaze to the bottom-right corner",
      position: { x: 80, y: 80 },
    },
  ]

  const requestCameraAccess = async () => {
    setCameraStatus("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setCameraStatus("granted")
      setFaceDetected(true) // Simulate face detection
    } catch (error) {
      setCameraStatus("denied")
      console.error("Camera access denied:", error)
    }
  }

  const startCalibration = () => {
    setIsCalibrating(true)
    setCalibrationStep(0)
    setGazeAccuracy(0)
  }

  const nextCalibrationStep = () => {
    if (calibrationStep < calibrationSteps.length - 1) {
      setCalibrationStep(calibrationStep + 1)
      setGazeAccuracy(((calibrationStep + 1) / calibrationSteps.length) * 100)
    } else {
      // Calibration complete
      setIsCalibrating(false)
      setGazeAccuracy(100)
      onSetupComplete?.()
    }
  }

  const currentStep = calibrationSteps[calibrationStep]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Camera Permission */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Camera Setup</h3>
            <p className="text-sm text-muted-foreground">Enable camera access for focus tracking</p>
          </div>
        </div>

        <div className="space-y-4">
          {cameraStatus === "idle" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Camera Access Required</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                FocusFlow needs camera access to track your attention and provide accurate focus metrics. All processing
                happens locally on your device.
              </p>
              <Button onClick={requestCameraAccess} className="gap-2">
                <Camera className="w-4 h-4" />
                Enable Camera
              </Button>
            </div>
          )}

          {cameraStatus === "requesting" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Requesting Camera Access</h4>
              <p className="text-sm text-muted-foreground">Please allow camera access in your browser</p>
            </div>
          )}

          {cameraStatus === "denied" && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Camera access was denied. Please enable camera permissions in your browser settings and refresh the
                page.
              </AlertDescription>
            </Alert>
          )}

          {cameraStatus === "granted" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-foreground">Camera Connected</span>
                </div>
                <Badge variant="default" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Active
                </Badge>
              </div>

              {/* Camera Preview */}
              <div className="relative rounded-lg overflow-hidden bg-muted/20">
                <video ref={videoRef} className="w-full h-48 object-cover" muted playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                {/* Face Detection Overlay */}
                {faceDetected && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="default" className="gap-1 bg-green-500">
                      <Eye className="w-3 h-3" />
                      Face Detected
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Calibration */}
      {cameraStatus === "granted" && (
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Gaze Calibration</h3>
              <p className="text-sm text-muted-foreground">Improve accuracy with personalized calibration</p>
            </div>
          </div>

          {!isCalibrating && gazeAccuracy === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Calibrate Your Gaze</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Follow the on-screen prompts to calibrate gaze tracking for better accuracy. This takes about 30
                seconds.
              </p>
              <Button onClick={startCalibration} variant="outline" className="gap-2 bg-transparent">
                <Target className="w-4 h-4" />
                Start Calibration
              </Button>
            </div>
          )}

          {isCalibrating && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-foreground mb-2">{currentStep.title}</h4>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>

              {/* Calibration Area */}
              <div className="relative w-full h-64 bg-muted/20 rounded-lg overflow-hidden">
                <div
                  className="absolute w-4 h-4 bg-primary rounded-full animate-pulse transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${currentStep.position.x}%`,
                    top: `${currentStep.position.y}%`,
                  }}
                />

                {/* Instructions */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Look at the glowing dot</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground">
                    {calibrationStep + 1} of {calibrationSteps.length}
                  </span>
                </div>
                <Progress value={((calibrationStep + 1) / calibrationSteps.length) * 100} className="h-2" />
              </div>

              <div className="text-center">
                <Button onClick={nextCalibrationStep} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {calibrationStep < calibrationSteps.length - 1 ? "Next Step" : "Complete Calibration"}
                </Button>
              </div>
            </div>
          )}

          {gazeAccuracy === 100 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Calibration Complete!</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your gaze tracking is now calibrated for optimal accuracy.
              </p>
              <Badge variant="default" className="gap-1">
                <Zap className="w-3 h-3" />
                Ready for Focus Tracking
              </Badge>
            </div>
          )}
        </Card>
      )}

      {/* Privacy Notice */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Privacy & Security</h3>
            <p className="text-sm text-muted-foreground">Your data stays on your device</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>All camera processing happens locally on your device</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>No video data is ever transmitted or stored remotely</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Only focus metrics are saved to improve your productivity</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>You can disable camera tracking at any time in settings</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
