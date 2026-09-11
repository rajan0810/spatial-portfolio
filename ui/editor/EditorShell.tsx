"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AchievementView, ProfileView, ProjectView, SkillView, TimelineView } from "@/lib/data/types";
import { useEditor, type EditorNode } from "@/lib/store/editor";
import { useExperience } from "@/lib/store/experience";

import { Console } from "./Console";
import { Hierarchy } from "./Hierarchy";
import { Inspector } from "./Inspector";
import { TopBar } from "./TopBar";
import { Viewport } from "./Viewport";

type Props = {
  profile: ProfileView;
  projects: ProjectView[];
  skills: SkillView[];
  achievements: AchievementView[];
  timeline: TimelineView[];
};

type MobilePanel = "hierarchy" | "inspector" | "console" | null;

/**
 * The editor.
 *
 * A four-panel layout — hierarchy, scene view, inspector, console — around the
 * live 3D scene, with a transport that runs the headset experience as the
 * game. Panels are resizable by dragging their edges. On a phone the panels
 * become sheets over the viewport, chosen from a bottom tab bar.
 *
 * ▶ Play hides the chrome and makes the viewport fullscreen; ■ Stop restores
 * the editor with the scene exactly where you left it.
 */
export function EditorShell({ profile, projects, skills, achievements, timeline }: Props) {
  const mode = useEditor((s) => s.mode);
  const layout = useEditor((s) => s.layout);
  const setNodes = useEditor((s) => s.setNodes);
  const select = useEditor((s) => s.select);
  const log = useEditor((s) => s.log);
  const overrides = useEditor((s) => s.overrides);
  const unlocked = useExperience((s) => s.unlocked);

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [inspectorWidth, setInspectorWidth] = useState(340);
  const [consoleHeight, setConsoleHeight] = useState(170);

  // The scene tree, from data.
  const nodes = useMemo<EditorNode[]>(
    () => [
      {
        id: "scene",
        name: "Portfolio",
        kind: "scene",
        children: [
          { id: "player", name: `${profile.name} (Player)`, kind: "player", station: "home" },
          {
            id: "projects",
            name: "Projects",
            kind: "folder",
            station: projects[0] ? "justix" : undefined,
            children: projects.map((p) => ({ id: `project:${p.slug}`, name: p.title, kind: "project" as const, station: "justix" as const })),
          },
          {
            id: "skills",
            name: "Skills",
            kind: "folder",
            children: skills.map((s) => ({ id: `skill:${s.id}`, name: s.name, kind: "skill" as const })),
          },
          {
            id: "achievements",
            name: "Achievements",
            kind: "folder",
            children: achievements.map((a) => ({ id: `ach:${a.id}`, name: a.title, kind: "achievement" as const })),
          },
          {
            id: "timeline",
            name: "Timeline",
            kind: "folder",
            children: timeline.map((t) => ({ id: `tl:${t.id}`, name: `${t.role} · ${t.org}`, kind: "timeline" as const })),
          },
          { id: "contact", name: "Contact", kind: "contact", station: "outro" },
        ],
      },
    ],
    [profile, projects, skills, achievements, timeline],
  );

  const loaded = useRef(false);
  useEffect(() => {
    setNodes(nodes);
    if (loaded.current) return;
    loaded.current = true;
    log("ok", `Scene loaded: ${projects.length} project${projects.length === 1 ? "" : "s"}, ${STATION_COUNT} stations`);
    select(projects[0] ? `project:${projects[0].slug}` : "player");
  }, [nodes, setNodes, select, log, projects]);

  // Achievements unlocked in the game show up in the console too.
  const seen = useRef(0);
  useEffect(() => {
    for (let i = seen.current; i < unlocked.length; i += 1) log("ok", `Achievement unlocked: ${unlocked[i]}`);
    seen.current = unlocked.length;
  }, [unlocked, log]);

  // The editor is an application, not a document.
  useEffect(() => {
    document.body.classList.add("editor");
    return () => document.body.classList.remove("editor");
  }, []);

  const unsaved = Object.keys(overrides).length > 0;
  const playing = mode === "play";

  // -- resizers ------------------------------------------------------------
  const dragInspector = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = inspectorWidth;
    const move = (ev: PointerEvent) => setInspectorWidth(Math.max(240, Math.min(560, startW + (startX - ev.clientX))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const dragConsole = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = consoleHeight;
    const move = (ev: PointerEvent) => setConsoleHeight(Math.max(90, Math.min(420, startH + (startY - ev.clientY))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const inspectorData = { profile, projects, skills, achievements, timeline };

  return (
    <div
      className={`ed ${playing ? "is-playing" : ""} ed-layout-${layout}`}
      style={{ ["--ed-inspector" as string]: `${inspectorWidth}px`, ["--ed-console" as string]: `${consoleHeight}px` }}
    >
      <a href="/flat" className="skip-link text-sm">
        Skip the editor — open flat mode
      </a>

      {!playing ? <TopBar unsaved={unsaved} /> : null}

      <div className="ed-grid">
        {!playing ? (
          <aside className={`ed-cell ed-cell--hierarchy ${mobilePanel === "hierarchy" ? "is-open" : ""}`}>
            <Hierarchy />
          </aside>
        ) : null}

        <main className="ed-cell ed-cell--viewport">
          <Viewport profile={profile} projects={projects} />
        </main>

        {!playing ? (
          <>
            <div className="ed-resizer ed-resizer--v" onPointerDown={dragInspector} role="separator" aria-orientation="vertical" />
            <aside className={`ed-cell ed-cell--inspector ${mobilePanel === "inspector" ? "is-open" : ""}`}>
              <Inspector data={inspectorData} />
            </aside>
            <div className="ed-resizer ed-resizer--h" onPointerDown={dragConsole} role="separator" aria-orientation="horizontal" />
            <section className={`ed-cell ed-cell--console ${mobilePanel === "console" ? "is-open" : ""}`}>
              <Console />
            </section>
          </>
        ) : null}
      </div>

      {!playing ? (
        <nav className="ed-mobiletabs" aria-label="Panels">
          {(["hierarchy", "inspector", "console"] as const).map((panel) => (
            <button
              key={panel}
              type="button"
              className={mobilePanel === panel ? "is-on" : ""}
              onClick={() => setMobilePanel((p) => (p === panel ? null : panel))}
              aria-pressed={mobilePanel === panel}
            >
              {panel[0].toUpperCase() + panel.slice(1)}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

const STATION_COUNT = 4;
