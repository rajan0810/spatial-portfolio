/**
 * Webcam hand tracking → the site's pointer.
 *
 * MediaPipe's hand landmarker runs entirely in the browser (WASM); frames
 * never leave the device. The index fingertip becomes the pointer and a
 * thumb–index pinch is a press — the same grammar the on-screen hand already
 * uses for the mouse, so nothing downstream needs to know the difference:
 * this dispatches ordinary pointer events at the canvas and clicks on DOM
 * targets, and the hand cursor, panel grabs, buttons and scroll all just work.
 *
 * Loaded lazily on opt-in: the model and WASM are ~8MB and belong nowhere near
 * the initial payload.
 */

export type HandFrame = {
  /** Pointer in clip space, -1 → 1, already mirrored so it feels like a mirror. */
  x: number;
  y: number;
  pinching: boolean;
  /** 0 → 1 confidence that a hand is present at all. */
  present: number;
};

type Listener = (frame: HandFrame | null) => void;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Thumb–index distance (normalised) below which we call it a pinch. Hysteresis on release. */
const PINCH_ON = 0.045;
const PINCH_OFF = 0.07;

export class HandTracker {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private landmarker: import("@mediapipe/tasks-vision").HandLandmarker | null = null;
  private frame = 0;
  private listeners = new Set<Listener>();
  private pinching = false;
  private smoothed = { x: 0, y: 0 };
  private lastTimestamp = -1;

  get running() {
    return Boolean(this.landmarker);
  }

  /** The live video element, for a preview. */
  get preview() {
    return this.video;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start() {
    if (this.landmarker) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.stream;
    await video.play();
    this.video = video;

    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    const tick = () => {
      this.frame = requestAnimationFrame(tick);
      this.detect();
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.pinching = false;
    this.emit(null);
  }

  private detect() {
    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker || video.readyState < 2) return;

    // MediaPipe requires strictly increasing timestamps.
    const now = performance.now();
    if (now <= this.lastTimestamp) return;
    this.lastTimestamp = now;

    const result = landmarker.detectForVideo(video, now);
    const hand = result.landmarks[0];
    if (!hand) {
      this.pinching = false;
      this.emit(null);
      return;
    }

    const index = hand[8];
    const thumb = hand[4];
    const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y, index.z - thumb.z);

    // Hysteresis so a pinch does not flicker at the threshold.
    if (!this.pinching && distance < PINCH_ON) this.pinching = true;
    else if (this.pinching && distance > PINCH_OFF) this.pinching = false;

    // Mirror x so moving your hand right moves the pointer right, as in a
    // mirror; smooth to take the jitter out without adding much lag.
    const targetX = (1 - index.x) * 2 - 1;
    const targetY = index.y * 2 - 1;
    this.smoothed.x += (targetX - this.smoothed.x) * 0.45;
    this.smoothed.y += (targetY - this.smoothed.y) * 0.45;

    this.emit({
      x: Math.max(-1, Math.min(1, this.smoothed.x * 1.25)),
      y: Math.max(-1, Math.min(1, this.smoothed.y * 1.25)),
      pinching: this.pinching,
      present: 1,
    });
  }

  private emit(frame: HandFrame | null) {
    this.listeners.forEach((l) => l(frame));
  }
}
