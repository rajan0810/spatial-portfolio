"use client";

import type { AchievementView, ProjectView, SkillView, TimelineView } from "@/lib/data/types";

import type { Camera } from "./camera";
import { SURFACE_Y, WORLD_W } from "./constants";

/**
 * Where Rajan's content sits in the shaft, in world units. Tokens pile around
 * these; the physics world gets a static body for each. Positions are fixed
 * by design, not by data, so the pile stays consistent as content changes.
 */
export type SlabRect = { x: number; y: number; w: number; h: number };

export function layoutSlabs(counts: { projects: number; achievements: number; skills: number; timeline: number }) {
  const slabs: { kind: "project" | "achievement" | "skill" | "timeline"; index: number; rect: SlabRect }[] = [];
  let y = SURFACE_Y + 520;

  for (let i = 0; i < counts.projects; i += 1) {
    const w = 620;
    const x = i % 2 === 0 ? 120 : WORLD_W - w - 120;
    slabs.push({ kind: "project", index: i, rect: { x, y, w, h: 520 } });
    y += 640;
  }

  if (counts.achievements) {
    const w = 220;
    for (let i = 0; i < counts.achievements; i += 1) {
      slabs.push({ kind: "achievement", index: i, rect: { x: 100 + (i % 3) * 300, y: y + Math.floor(i / 3) * 190, w, h: 150 } });
    }
    y += 190 * Math.ceil(counts.achievements / 3) + 120;
  }

  if (counts.skills) {
    for (let i = 0; i < counts.skills; i += 1) {
      const w = 170 + ((i * 37) % 90);
      slabs.push({ kind: "skill", index: i, rect: { x: 80 + ((i * 211) % (WORLD_W - w - 160)), y: y + (i % 4) * 70, w, h: 44 } });
    }
    y += 70 * 4 + 120;
  }

  for (let i = 0; i < counts.timeline; i += 1) {
    slabs.push({ kind: "timeline", index: i, rect: { x: 60, y, w: WORLD_W - 120, h: 96 } });
    y += 140;
  }

  return slabs;
}

type Common = { rect: SlabRect; cam: Camera };

const place = ({ rect, cam }: Common): React.CSSProperties => ({
  position: "absolute",
  left: cam.offsetX + rect.x * cam.scale,
  top: rect.y * cam.scale,
  width: rect.w * cam.scale,
  minHeight: rect.h * cam.scale,
});

export function ProjectSlab({ project, rect, cam }: Common & { project: ProjectView }) {
  return (
    <article className="slab overflow-hidden p-5 sm:p-7" style={place({ rect, cam })} aria-label={project.title}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">{project.title}</h2>
        {project.platform ? <span className="ink-label">{project.platform}</span> : null}
      </div>
      {project.subtitle ? <p className="mt-1 text-lamp">{project.subtitle}</p> : null}
      <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-dim">{project.description}</p>

      {project.tech.length ? (
        <dl className="mt-4 grid gap-1.5 sm:grid-cols-3">
          {project.tech.map((g) => (
            <div key={g.surface}>
              <dt className="ink-label">{g.surface}</dt>
              <dd className="mt-0.5 text-xs text-ink-dim">{g.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {project.highlights.length ? (
        <ul className="mt-4 grid gap-1.5 text-sm text-ink-dim">
          {project.highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lamp" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {project.links.length ? (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={`${project.title} links`}>
          {project.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-ink/20 px-3 py-1.5 text-sm text-ink transition-colors hover:border-lamp hover:text-lamp"
            >
              {l.label} ↗
            </a>
          ))}
        </nav>
      ) : null}
    </article>
  );
}

export function FossilSlab({ achievement, rect, cam }: Common & { achievement: AchievementView }) {
  return (
    <article className="slab p-4" style={{ ...place({ rect, cam }), borderRadius: "50% 50% 46% 46% / 60% 60% 40% 40%" }}>
      <p className="ink-label text-lamp">{achievement.placement ?? "Fossil"}</p>
      <h3 className="mt-1 text-base font-medium">{achievement.title}</h3>
      {achievement.event ? <p className="text-xs text-ink-dim">{achievement.event}</p> : null}
    </article>
  );
}

export function VeinSlab({ skill, rect, cam }: Common & { skill: SkillView }) {
  return (
    <div className="slab flex items-center gap-2 px-3 py-2" style={place({ rect, cam })}>
      <span className="size-1.5 rounded-full bg-moss" aria-hidden />
      <span className="text-sm">{skill.name}</span>
      <span className="ink-label ml-auto">{skill.category}</span>
    </div>
  );
}

export function StratumSlab({ entry, rect, cam }: Common & { entry: TimelineView }) {
  return (
    <div className="slab flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4" style={place({ rect, cam })}>
      <span className="ink-label">
        {entry.startDate ?? "?"} → {entry.endDate ?? "present"}
      </span>
      <span className="text-base font-medium">{entry.role}</span>
      <span className="text-sm text-ink-dim">{entry.org}</span>
      {entry.blurb ? <p className="w-full text-sm text-ink-dim">{entry.blurb}</p> : null}
    </div>
  );
}
