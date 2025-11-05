/**
 * Face Detection + Focus Manager (hot-reload safe)
 * MediaPipe Face Mesh with TFJS WebGL fallback
 * Supports mirrored input via internal canvas
 */

let detector: any = null;
let runtime: "mediapipe" | "tfjs" | "unknown" = "unknown";

// Mirrored inference canvas
let frameCanvas: HTMLCanvasElement | null = null;
let frameCtx: CanvasRenderingContext2D | null = null;

// Options
let mirrored = true;

type Keypoint = { x: number; y: number; name?: string };

export type FaceFocusSnapshot = {
  faceDetected: boolean;
  isLookingAtScreen: boolean;
  confidence: number; // 0-100
  keypoints?: Keypoint[];
  fps: number;
  runtime: "mediapipe" | "tfjs" | "unknown";
  sourceW: number;
  sourceH: number;
  ts: number;
};

type Subscriber = (s: FaceFocusSnapshot) => void;

type Manager = {
  video: HTMLVideoElement | null;
  running: boolean;
  ready: boolean;
  subscribers: Set<Subscriber>;
  rafId: number | null;
  lastFrameTs: number;
  fpsCnt: number;
  fpsTs: number;
  lastFaceSeenTs: number;
  hasFaceDebounced: boolean;
  includeKeypoints: boolean;
  initDetector: (prefer?: "mediapipe" | "tfjs") => Promise<void>;
  attachVideo: (video: HTMLVideoElement) => void;
  start: (opts?: { includeKeypoints?: boolean }) => void;
  stop: () => void;
  subscribe: (fn: Subscriber) => () => void;
  dispose: () => Promise<void>;
};

declare global {
  interface Window {
    __FACE_FOCUS_MANAGER__?: Manager;
  }
}

function getManager(): Manager {
  if (typeof window === "undefined") {
    throw new Error("FaceFocusManager requires window");
  }
  if (window.__FACE_FOCUS_MANAGER__) return window.__FACE_FOCUS_MANAGER__;

  const mgr: Manager = {
    video: null,
    running: false,
    ready: false,
    subscribers: new Set<Subscriber>(),
    rafId: null,
    lastFrameTs: performance.now(),
    fpsCnt: 0,
    fpsTs: performance.now(),
    lastFaceSeenTs: 0,
    hasFaceDebounced: false,
    includeKeypoints: false,

    initDetector: async (prefer = "mediapipe") => {
      if (detector) return;

      const faceLandmarksDetection = await import(
        "@tensorflow-models/face-landmarks-detection"
      );

      const tryMediapipe = async () => {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detector = await faceLandmarksDetection.createDetector(model, {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4",
          refineLandmarks: true,
          maxFaces: 1,
        } as any);
        runtime = "mediapipe";
        console.log("✅ Face Detection Initialized (MediaPipe)");
      };

      const tryTFJS = async () => {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detector = await faceLandmarksDetection.createDetector(model, {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 1,
        } as any);
        runtime = "tfjs";
        console.log("✅ Face Detection Initialized (TFJS)");
      };

      try {
        if (prefer === "mediapipe") {
          try {
            await tryMediapipe();
          } catch (mpErr) {
            console.warn(
              "⚠️ MediaPipe init failed, falling back to TFJS:",
              mpErr
            );
            await tryTFJS();
          }
        } else {
          try {
            await tryTFJS();
          } catch (tfErr) {
            console.warn(
              "⚠️ TFJS init failed, falling back to MediaPipe:",
              tfErr
            );
            await tryMediapipe();
          }
        }
      } catch (e) {
        console.error("❌ Detector init failed:", e);
        detector = null;
        runtime = "unknown";
      }
    },

    attachVideo: (video: HTMLVideoElement) => {
      mgr.video = video;
    },

    start: (opts) => {
      if (mgr.running) return;
      mgr.includeKeypoints = !!opts?.includeKeypoints;
      mgr.running = true;
      mgr.lastFrameTs = performance.now();
      mgr.fpsCnt = 0;
      mgr.fpsTs = performance.now();

      const loop = async () => {
        if (!mgr.running) return;
        const video = mgr.video;
        let snapshot: FaceFocusSnapshot | null = null;

        try {
          if (video && isVideoReady(video) && detector) {
            ensureFrameCanvas(video.videoWidth, video.videoHeight);

            // mirror input frame only if requested
            if (mirrored) {
              frameCtx!.save();
              frameCtx!.translate(frameCanvas!.width, 0);
              frameCtx!.scale(-1, 1);
              frameCtx!.drawImage(
                video,
                0,
                0,
                frameCanvas!.width,
                frameCanvas!.height
              );
              frameCtx!.restore();
            } else {
              frameCtx!.drawImage(
                video,
                0,
                0,
                frameCanvas!.width,
                frameCanvas!.height
              );
            }

            const faces = await detector.estimateFaces(frameCanvas);
            const now = performance.now();

            // debounce 'no-face' for 200ms to avoid flicker
            if (faces && faces.length > 0) {
              mgr.lastFaceSeenTs = now;
              mgr.hasFaceDebounced = true;
            } else if (now - mgr.lastFaceSeenTs > 200) {
              mgr.hasFaceDebounced = false;
            }

            const faceDetected = !!faces && faces.length > 0;
            const hasFace = faceDetected || mgr.hasFaceDebounced;

            let isLooking = false;
            let confidence = 0;
            let keypoints: Keypoint[] | undefined = undefined;

            if (hasFace) {
              const kps = faces![0].keypoints || [];
              const result = checkGazeDirection(kps);
              isLooking = result.isLooking;
              confidence = result.confidence;
              keypoints = mgr.includeKeypoints ? kps : undefined;
            }

            // fps
            mgr.fpsCnt += 1;
            let fps = 0;
            if (now - mgr.fpsTs >= 500) {
              fps = Math.round((mgr.fpsCnt * 1000) / (now - mgr.fpsTs));
              mgr.fpsCnt = 0;
              mgr.fpsTs = now;
            }

            snapshot = {
              faceDetected: hasFace,
              isLookingAtScreen: isLooking && hasFace,
              confidence,
              fps,
              runtime,
              sourceW: frameCanvas!.width,
              sourceH: frameCanvas!.height,
              keypoints,
              ts: now,
            };
          }
        } catch (e) {
          console.error("Detection error:", e);
        }

        if (snapshot) {
          mgr.subscribers.forEach((fn) => {
            try {
              fn(snapshot!);
            } catch {}
          });
        }

        mgr.rafId = requestAnimationFrame(loop);
      };

      mgr.rafId = requestAnimationFrame(loop);
    },

    stop: () => {
      mgr.running = false;
      if (mgr.rafId) {
        cancelAnimationFrame(mgr.rafId);
        mgr.rafId = null;
      }
    },

    subscribe: (fn: Subscriber) => {
      mgr.subscribers.add(fn);
      return () => {
        mgr.subscribers.delete(fn);
      };
    },

    dispose: async () => {
      mgr.stop();
      if (detector) {
        try {
          await detector.dispose?.();
        } catch {}
      }
      detector = null;
      runtime = "unknown";
      frameCanvas = null;
      frameCtx = null;
      mgr.ready = false;
      console.log("🧹 Face detection cleaned up");
    },
  };

  window.__FACE_FOCUS_MANAGER__ = mgr;
  return mgr;
}

function ensureFrameCanvas(w: number, h: number) {
  const targetW = Math.min(640, w || 640);
  const scale = targetW / (w || 640);
  const targetH = Math.round((h || 480) * scale);
  if (!frameCanvas) {
    frameCanvas = document.createElement("canvas");
  }
  if (frameCanvas.width !== targetW || frameCanvas.height !== targetH) {
    frameCanvas.width = targetW;
    frameCanvas.height = targetH;
    frameCtx = frameCanvas.getContext("2d", { willReadFrequently: false })!;
  }
}

function isVideoReady(video: HTMLVideoElement | null) {
  return (
    !!video &&
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

function checkGazeDirection(keypoints: Keypoint[]): {
  isLooking: boolean;
  confidence: number;
} {
  const byName = (name: string) =>
    (keypoints as any).find((k: any) => k.name === name);
  const IDX = {
    NOSE_TIP: 1,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_INNER: 362,
    LEFT_EYE_OUTER: 33,
    RIGHT_EYE_OUTER: 263,
    CHIN: 152,
  };

  const nose = byName("noseTip") || (keypoints as any)[IDX.NOSE_TIP];
  const leftEyeInner =
    byName("leftEyeInner") || (keypoints as any)[IDX.LEFT_EYE_INNER];
  const rightEyeInner =
    byName("rightEyeInner") || (keypoints as any)[IDX.RIGHT_EYE_INNER];
  const leftEyeOuter =
    byName("leftEyeOuter") || (keypoints as any)[IDX.LEFT_EYE_OUTER];
  const rightEyeOuter =
    byName("rightEyeOuter") || (keypoints as any)[IDX.RIGHT_EYE_OUTER];
  const chin = byName("chin") || (keypoints as any)[IDX.CHIN];

  if (
    !nose ||
    !leftEyeInner ||
    !rightEyeInner ||
    !leftEyeOuter ||
    !rightEyeOuter ||
    !chin
  ) {
    return { isLooking: false, confidence: 0 };
  }

  const eyeCenterX = (leftEyeInner.x + rightEyeInner.x) / 2;
  const eyeCenterY = (leftEyeInner.y + rightEyeInner.y) / 2;

  const noseToEyeCenterX = Math.abs(nose.x - eyeCenterX);
  const eyeWidth = Math.max(
    1,
    Math.abs((rightEyeOuter as any).x - (leftEyeOuter as any).x)
  );
  const horizontalRatio = noseToEyeCenterX / eyeWidth;

  const noseToEyeY = Math.abs(nose.y - eyeCenterY);
  const noseToChinY = Math.max(1, Math.abs((chin as any).y - (nose as any).y));
  const verticalRatio = noseToEyeY / noseToChinY;

  const HORIZONTAL_THRESHOLD = 0.18;
  const VERTICAL_LOW = 0.25;
  const VERTICAL_HIGH = 0.75;

  const isHorizontallyCentered = horizontalRatio < HORIZONTAL_THRESHOLD;
  const isVerticallyAligned =
    verticalRatio < VERTICAL_HIGH && verticalRatio > VERTICAL_LOW;
  const isLooking = isHorizontallyCentered && isVerticallyAligned;

  const horizConf = Math.max(0, 1 - horizontalRatio / HORIZONTAL_THRESHOLD);
  const verticalCenter = (VERTICAL_LOW + VERTICAL_HIGH) / 2;
  const verticalHalfWindow = (VERTICAL_HIGH - VERTICAL_LOW) / 2;
  const vertConf = Math.max(
    0,
    1 - Math.abs(verticalRatio - verticalCenter) / verticalHalfWindow
  );
  const confidence = Math.round(((horizConf + vertConf) / 2) * 100);

  return { isLooking, confidence };
}

/* Public API */

export async function requestCameraAccess(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log("✅ Camera access granted");
  return stream;
}

export async function ensureFaceFocus(video: HTMLVideoElement) {
  const mgr = getManager();
  mgr.attachVideo(video);
  await mgr.initDetector("mediapipe");
}

export function startFaceFocus(opts?: {
  includeKeypoints?: boolean;
  mirrored?: boolean;
}) {
  if (typeof opts?.mirrored === "boolean") mirrored = opts.mirrored;
  const mgr = getManager();
  mgr.start({ includeKeypoints: !!opts?.includeKeypoints });
}

export function stopFaceFocus() {
  const mgr = getManager();
  mgr.stop();
}

export function subscribeFaceFocus(fn: Subscriber) {
  const mgr = getManager();
  return mgr.subscribe(fn);
}

export async function cleanupFaceDetection() {
  const mgr = getManager();
  await mgr.dispose();
}

export function getFaceDetectionRuntime(): "mediapipe" | "tfjs" | "unknown" {
  return runtime;
}

// Allow toggling options while running
export function setFaceFocusOptions(opts: {
  mirrored?: boolean;
  includeKeypoints?: boolean;
}) {
  if (typeof opts.mirrored === "boolean") mirrored = opts.mirrored;
  if (typeof opts.includeKeypoints === "boolean") {
    const mgr = getManager();
    mgr.includeKeypoints = opts.includeKeypoints;
  }
}
