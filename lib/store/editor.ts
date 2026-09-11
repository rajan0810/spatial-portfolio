import { create } from "zustand";

import type { StationId } from "@/lib/stations";

/**
 * The editor.
 *
 * The portfolio opens as a game-engine editor with one scene loaded: Rajan.
 * The hierarchy is the site map, the inspector is a structured résumé, the
 * scene view is the world, and ▶ Play runs the headset experience as the game.
 *
 * This store is the editor's own state; the running game keeps using
 * lib/store/experience.ts, untouched.
 */

export type NodeKind =
  | "scene"
  | "player"
  | "folder"
  | "project"
  | "skill"
  | "achievement"
  | "timeline"
  | "contact";

export type EditorNode = {
  id: string;
  name: string;
  kind: NodeKind;
  /** Which station the scene camera frames when this is selected. */
  station?: StationId;
  children?: EditorNode[];
};

export type LogLevel = "info" | "warn" | "error" | "ok";
export type LogLine = { id: number; at: number; level: LogLevel; text: string };

export type ViewTab = "scene" | "game";
export type EditorLayout = "default" | "tall" | "wide";

type EditorState = {
  mode: "edit" | "play";
  /** Play halts the render loop; step advances exactly one frame. */
  paused: boolean;
  stepRequested: number;
  viewTab: ViewTab;
  layout: EditorLayout;

  nodes: EditorNode[];
  setNodes: (nodes: EditorNode[]) => void;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;

  selectedId: string | null;
  select: (id: string | null) => void;
  /** Bumped whenever the user asks to frame the selection (F key, double-click). */
  frameRequest: number;
  requestFrame: () => void;

  /**
   * Runtime-only edits made in the inspector, by node id then field. The
   * scene reads through these so a change in a field shows in the world.
   * Never persisted — an editor without a Save is still an editor.
   */
  overrides: Record<string, Record<string, unknown>>;
  setOverride: (id: string, field: string, value: unknown) => void;
  revert: (id?: string) => void;

  console: LogLine[];
  log: (level: LogLevel, text: string) => void;
  clearConsole: () => void;

  play: () => void;
  stop: () => void;
  togglePause: () => void;
  step: () => void;
  setViewTab: (tab: ViewTab) => void;
  setLayout: (layout: EditorLayout) => void;
};

let lineId = 0;

export const useEditor = create<EditorState>()((set, get) => ({
  mode: "edit",
  paused: false,
  stepRequested: 0,
  viewTab: "scene",
  layout: "default",

  nodes: [],
  setNodes: (nodes) => set({ nodes }),
  expanded: { scene: true, projects: true },
  toggleExpanded: (id) => set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),

  selectedId: null,
  select: (id) => {
    if (get().selectedId === id) return;
    set({ selectedId: id });
    if (id) {
      const node = findNode(get().nodes, id);
      if (node) get().log("info", `Selected ${node.name}`);
    }
  },
  frameRequest: 0,
  requestFrame: () => set((s) => ({ frameRequest: s.frameRequest + 1 })),

  overrides: {},
  setOverride: (id, field, value) =>
    set((s) => ({ overrides: { ...s.overrides, [id]: { ...(s.overrides[id] ?? {}), [field]: value } } })),
  revert: (id) => {
    if (!id) {
      set({ overrides: {} });
      get().log("info", "Reverted all runtime changes");
      return;
    }
    set((s) => {
      const next = { ...s.overrides };
      delete next[id];
      return { overrides: next };
    });
    get().log("info", `Reverted ${id}`);
  },

  console: [],
  log: (level, text) =>
    set((s) => ({
      console: [...s.console.slice(-199), { id: (lineId += 1), at: Date.now(), level, text }],
    })),
  clearConsole: () => set({ console: [] }),

  play: () => {
    if (get().mode === "play") return;
    set({ mode: "play", paused: false });
    get().log("ok", "Entering Play mode");
  },
  stop: () => {
    if (get().mode === "edit") return;
    set({ mode: "edit", paused: false });
    get().log("info", "Exited Play mode");
  },
  togglePause: () => {
    const paused = !get().paused;
    set({ paused });
    get().log("info", paused ? "Paused" : "Resumed");
  },
  step: () => {
    if (!get().paused) set({ paused: true });
    set((s) => ({ stepRequested: s.stepRequested + 1 }));
  },
  setViewTab: (viewTab) => set({ viewTab }),
  setLayout: (layout) => set({ layout }),
}));

export function findNode(nodes: EditorNode[], id: string): EditorNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Selection resolved to a station, walking up to the nearest ancestor with one. */
export function stationFor(nodes: EditorNode[], id: string | null): StationId | null {
  if (!id) return null;
  const path = pathTo(nodes, id);
  for (let i = path.length - 1; i >= 0; i -= 1) if (path[i].station) return path[i].station!;
  return null;
}

export function pathTo(nodes: EditorNode[], id: string, trail: EditorNode[] = []): EditorNode[] {
  for (const node of nodes) {
    const next = [...trail, node];
    if (node.id === id) return next;
    if (node.children) {
      const found = pathTo(node.children, id, next);
      if (found.length) return found;
    }
  }
  return [];
}
