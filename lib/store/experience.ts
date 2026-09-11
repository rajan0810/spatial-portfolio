import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Discrete UI state only. Anything that changes every frame belongs in
 * lib/store/rail.ts, not here.
 */

export type ComfortSettings = {
  /** Collapses camera travel and parallax. Mirrors prefers-reduced-motion. */
  reduceMotion: boolean;
  /** Vignette during camera movement — the real Quest comfort control. */
  vignette: boolean;
  /** Snap between stations instead of gliding. */
  snapTransitions: boolean;
  audio: boolean;
  /** fps / frame-time overlay. On by default: it is part of the argument. */
  perfHud: boolean;
};

type ExperienceState = {
  comfort: ComfortSettings;
  setComfort: (patch: Partial<ComfortSettings>) => void;

  booted: boolean;
  setBooted: (booted: boolean) => void;

  comfortMenuOpen: boolean;
  toggleComfortMenu: () => void;

  /** Index of the station the camera is currently nearest. */
  activeStation: number;
  setActiveStation: (index: number) => void;

  /** Achievement toasts fired this session, by id, so they fire only once. */
  unlocked: string[];
  unlock: (id: string) => void;
};

const DEFAULT_COMFORT: ComfortSettings = {
  reduceMotion: false,
  vignette: true,
  snapTransitions: false,
  audio: false, // Opt-in. Autoplaying audio is hostile, and browsers block it anyway.
  perfHud: true,
};

export const useExperience = create<ExperienceState>()(
  persist(
    (set, get) => ({
      comfort: DEFAULT_COMFORT,
      setComfort: (patch) =>
        set((state) => ({ comfort: { ...state.comfort, ...patch } })),

      booted: false,
      setBooted: (booted) => set({ booted }),

      comfortMenuOpen: false,
      toggleComfortMenu: () =>
        set((state) => ({ comfortMenuOpen: !state.comfortMenuOpen })),

      activeStation: 0,
      setActiveStation: (index) => {
        // Guard: setActiveStation is called from the render loop, so bail out
        // before touching the store when nothing actually changed.
        if (get().activeStation !== index) set({ activeStation: index });
      },

      unlocked: [],
      unlock: (id) =>
        set((state) =>
          state.unlocked.includes(id)
            ? state
            : { unlocked: [...state.unlocked, id] },
        ),
    }),
    {
      name: "rh-comfort",
      // Only comfort settings persist. Boot state and achievement toasts should
      // replay for each visit — that is the experience.
      partialize: (state) => ({ comfort: state.comfort }),
    },
  ),
);
