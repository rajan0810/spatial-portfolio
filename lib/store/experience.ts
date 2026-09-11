import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Discrete UI state only. Anything that changes every frame belongs in
 * lib/store/rail.ts, not here.
 */

/**
 * The arc of a visit, played completely straight:
 *
 *   desk      a headset resting on a desk. Pick it up.
 *   donning   it rises to meet your eyes; the screen goes dark
 *   boot      the headset starts
 *   guardian  first-time setup: draw your boundary on the floor
 *   floor     first-time setup: confirm floor level
 *   live      the environment; scroll is unlocked
 *   doffing   taking it off — on the way to flat mode
 *
 * A returning visitor with a saved guardian skips both setup steps, exactly
 * as a headset that has already been set up would.
 */
export type Phase =
  | "desk"
  | "donning"
  | "boot"
  | "guardian"
  | "floor"
  | "live"
  | "doffing";

/** A boundary polygon on the floor, in viewer-local metres: [x, z] pairs. */
export type GuardianPolygon = [number, number][];

export type ComfortSettings = {
  /** Collapses camera travel and parallax. Mirrors prefers-reduced-motion. */
  reduceMotion: boolean;
  /** Vignette during camera movement — the real Quest comfort control. */
  vignette: boolean;
  /** Snap between stations instead of gliding. */
  snapTransitions: boolean;
  /** Full-screen lens pass: barrel distortion, chromatic fringe, lens vignette. */
  lens: boolean;
  /** The faint subpixel grid every headset owner knows. Rides on the lens pass. */
  screenDoor: boolean;
  audio: boolean;
  /** Webcam hand tracking: your index finger is the pointer, a pinch is a press. */
  handTracking: boolean;
  /** fps / frame-time overlay. On by default: it is part of the argument. */
  perfHud: boolean;
};

type ExperienceState = {
  comfort: ComfortSettings;
  setComfort: (patch: Partial<ComfortSettings>) => void;

  phase: Phase;
  setPhase: (phase: Phase) => void;

  /** Saved boundary. Null until drawn; a default shape is used when skipped. */
  guardian: GuardianPolygon | null;
  setGuardian: (polygon: GuardianPolygon | null) => void;

  comfortMenuOpen: boolean;
  toggleComfortMenu: () => void;

  /** Index of the station the camera is currently nearest. */
  activeStation: number;
  setActiveStation: (index: number) => void;

  /** Achievement toasts fired this session, by id, so they fire only once. */
  unlocked: string[];
  unlock: (id: string) => void;
  /** Toasts waiting to be shown, in order. Consumed by AchievementToast. */
  pendingToasts: string[];
  /** Unlock and queue a toast. Safe to call from anywhere, including the render loop. */
  announce: (id: string) => void;
  shiftToast: () => void;

  /** Whether the one-time sound prompt has been answered this session. */
  soundPromptDone: boolean;
  setSoundPromptDone: () => void;
  handsPromptDone: boolean;
  setHandsPromptDone: () => void;
};

const DEFAULT_COMFORT: ComfortSettings = {
  reduceMotion: false,
  vignette: true,
  snapTransitions: false,
  lens: true,
  screenDoor: true,
  audio: false, // Opt-in. Autoplaying audio is hostile, and browsers block it anyway.
  handTracking: false, // Opt-in: it needs the camera.
  perfHud: true,
};

export const useExperience = create<ExperienceState>()(
  persist(
    (set, get) => ({
      comfort: DEFAULT_COMFORT,
      setComfort: (patch) =>
        set((state) => ({ comfort: { ...state.comfort, ...patch } })),

      phase: "desk",
      setPhase: (phase) => {
        if (get().phase !== phase) set({ phase });
      },

      guardian: null,
      setGuardian: (guardian) => set({ guardian }),

      comfortMenuOpen: false,
      toggleComfortMenu: () =>
        set((state) => ({ comfortMenuOpen: !state.comfortMenuOpen })),

      activeStation: 0,
      setActiveStation: (index) => {
        // Called from the render loop: bail before touching the store when
        // nothing actually changed.
        if (get().activeStation !== index) set({ activeStation: index });
      },

      unlocked: [],
      unlock: (id) =>
        set((state) =>
          state.unlocked.includes(id)
            ? state
            : { unlocked: [...state.unlocked, id] },
        ),
      pendingToasts: [],
      announce: (id) => {
        const state = get();
        if (state.unlocked.includes(id)) return;
        set({ unlocked: [...state.unlocked, id], pendingToasts: [...state.pendingToasts, id] });
      },
      shiftToast: () => set((state) => ({ pendingToasts: state.pendingToasts.slice(1) })),

      soundPromptDone: false,
      setSoundPromptDone: () => set({ soundPromptDone: true }),
      handsPromptDone: false,
      setHandsPromptDone: () => set({ handsPromptDone: true }),
    }),
    {
      name: "rh-headset",
      // Comfort settings and the drawn guardian persist — a headset remembers
      // its setup. Phase and achievement toasts replay for each visit; that
      // arc is the experience.
      partialize: (state) => ({ comfort: { ...state.comfort, handTracking: false }, guardian: state.guardian }),
    },
  ),
);

/** Whether scroll and the station overlay should be active. */
export const isLive = (phase: Phase) => phase === "live" || phase === "doffing";
