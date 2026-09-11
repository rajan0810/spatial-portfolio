"use client";

import { useEffect, useState, type ReactNode } from "react";

import { withOverrides } from "@/lib/data/overrides";
import type { AchievementView, ProfileView, ProjectView, SkillView, TimelineView } from "@/lib/data/types";
import type { ProjectLink, TechGroup } from "@/lib/db/schema";
import { findNode, useEditor } from "@/lib/store/editor";
import { sceneRegistry } from "@/lib/store/sceneRegistry";
import { STATIONS, type StationId } from "@/lib/stations";

export type InspectorData = {
  profile: ProfileView;
  projects: ProjectView[];
  skills: SkillView[];
  achievements: AchievementView[];
  timeline: TimelineView[];
};

/**
 * The inspector: the selected object's components.
 *
 * For a project that is a Transform, a `Project (Script)` block whose fields
 * are the case study, a `Demo (VideoPlayer)` and a `Links` block. Fields are
 * live: a tech surface renamed here is renamed on the 3D label in the scene
 * view immediately. Nothing is saved — the asterisk in the title bar and the
 * Revert button are the whole persistence story, as they should be for an
 * editor with no Save.
 */
export function Inspector({ data }: { data: InspectorData }) {
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const overrides = useEditor((s) => s.overrides);
  const setOverride = useEditor((s) => s.setOverride);
  const revert = useEditor((s) => s.revert);

  const node = selectedId ? findNode(nodes, selectedId) : null;

  return (
    <section className="ed-panel" aria-label="Inspector">
      <header className="ed-panel__head">
        <span>Inspector</span>
        {node && overrides[node.id] ? (
          <button type="button" className="ed-btn ed-btn--small" onClick={() => revert(node.id)}>
            Revert
          </button>
        ) : null}
      </header>
      <div className="ed-panel__body ed-inspector">
        {!node ? (
          <p className="ed-dim ed-inspector__empty">Select an object in the Hierarchy.</p>
        ) : (
          <>
            <div className="ed-inspector__title">
              <input type="checkbox" checked readOnly aria-label="Active" />
              <span className="ed-inspector__name">{node.name}</span>
              <span className="ed-tag">{node.kind}</span>
            </div>

            {node.station ? <TransformComponent station={node.station} /> : null}

            {node.kind === "player" ? (
              <ProfileComponent
                profile={withOverrides(data.profile, overrides[node.id])}
                onChange={(field, value) => setOverride(node.id, field, value)}
              />
            ) : null}

            {node.kind === "project" ? (
              <ProjectComponents
                project={withOverrides(
                  data.projects.find((p) => `project:${p.slug}` === node.id) ?? data.projects[0],
                  overrides[node.id],
                )}
                onChange={(field, value) => setOverride(node.id, field, value)}
              />
            ) : null}

            {node.kind === "folder" ? <FolderComponent node={node} data={data} /> : null}

            {node.kind === "skill" ? <SkillComponent skill={data.skills.find((s) => `skill:${s.id}` === node.id)} /> : null}
            {node.kind === "achievement" ? (
              <AchievementComponent achievement={data.achievements.find((a) => `ach:${a.id}` === node.id)} />
            ) : null}
            {node.kind === "timeline" ? (
              <TimelineComponent entry={data.timeline.find((t) => `tl:${t.id}` === node.id)} />
            ) : null}

            {node.kind === "contact" ? <ContactComponent profile={data.profile} /> : null}
            {node.kind === "scene" ? <SceneComponent data={data} /> : null}
          </>
        )}
      </div>
    </section>
  );
}

// -- components -----------------------------------------------------------------

function Component({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ed-comp">
      <button type="button" className="ed-comp__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        <span className="ed-comp__title">{title}</span>
      </button>
      {open ? <div className="ed-comp__body">{children}</div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ed-field">
      <span className="ed-field__label">{label}</span>
      <span className="ed-field__control">{children}</span>
    </label>
  );
}

function Text({ value, onChange, multiline = false }: { value: string; onChange?: (v: string) => void; multiline?: boolean }) {
  const common = {
    className: "ed-input",
    value,
    readOnly: !onChange,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange?.(e.target.value),
  };
  return multiline ? <textarea {...common} rows={4} /> : <input type="text" {...common} />;
}

function Vec3({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <span className="ed-vec3">
      {[
        ["X", x],
        ["Y", y],
        ["Z", z],
      ].map(([axis, v]) => (
        <span key={axis as string} className="ed-vec3__axis">
          <span className={`ed-axis ed-axis-${(axis as string).toLowerCase()}`}>{axis}</span>
          <input className="ed-input ed-input--num" value={(v as number).toFixed(2)} readOnly />
        </span>
      ))}
    </span>
  );
}

function TransformComponent({ station }: { station: string }) {
  const def = STATIONS.find((s) => s.id === station);
  // Live, sampled at 5Hz: dragging the gizmo or a panel shows here.
  const [pos, setPos] = useState({ x: 0, y: 0, z: def?.z ?? 0 });
  useEffect(() => {
    const id = window.setInterval(() => {
      const group = sceneRegistry.get(station as StationId);
      if (group) setPos({ x: group.position.x, y: group.position.y, z: (def?.z ?? 0) + group.position.z });
    }, 200);
    return () => window.clearInterval(id);
  }, [station, def]);
  return (
    <Component title="Transform">
      <Field label="Position">
        <Vec3 x={pos.x} y={pos.y} z={pos.z} />
      </Field>
      <Field label="Rotation">
        <Vec3 x={0} y={0} z={0} />
      </Field>
      <Field label="Scale">
        <Vec3 x={1} y={1} z={1} />
      </Field>
      <p className="ed-hint">Drag the gizmo in the Scene view to move this station.</p>
    </Component>
  );
}

function ProfileComponent({ profile, onChange }: { profile: ProfileView; onChange: (f: string, v: unknown) => void }) {
  return (
    <>
      <Component title="Profile (Script)">
        <Field label="Name">
          <Text value={profile.name} onChange={(v) => onChange("name", v)} />
        </Field>
        <Field label="Headline">
          <Text value={profile.headline} onChange={(v) => onChange("headline", v)} />
        </Field>
        <Field label="Bio">
          <Text value={profile.bio} onChange={(v) => onChange("bio", v)} multiline />
        </Field>
      </Component>
      <Component title="Socials">
        <LinkRow label="GitHub" url={profile.githubUrl} />
        <LinkRow label="LinkedIn" url={profile.linkedinUrl} />
        <LinkRow label="Email" url={profile.email ? `mailto:${profile.email}` : null} display={profile.email} />
        <LinkRow label="Résumé" url={profile.resumeUrl} />
      </Component>
    </>
  );
}

function ProjectComponents({ project, onChange }: { project: ProjectView; onChange: (f: string, v: unknown) => void }) {
  const setTech = (tech: TechGroup[]) => onChange("tech", tech);
  return (
    <>
      <Component title="Project (Script)">
        <Field label="Title">
          <Text value={project.title} onChange={(v) => onChange("title", v)} />
        </Field>
        <Field label="Subtitle">
          <Text value={project.subtitle ?? ""} onChange={(v) => onChange("subtitle", v)} />
        </Field>
        <Field label="Role">
          <Text value={project.role ?? ""} onChange={(v) => onChange("role", v)} />
        </Field>
        <Field label="Platform">
          <Text value={project.platform ?? ""} onChange={(v) => onChange("platform", v)} />
        </Field>
        <Field label="Description">
          <Text value={project.description} onChange={(v) => onChange("description", v)} multiline />
        </Field>
      </Component>

      <Component title={`Tech (${project.tech.length} surfaces)`}>
        {project.tech.map((group, i) => (
          <div key={i} className="ed-subblock">
            <Field label={`Surface ${i + 1}`}>
              <Text
                value={group.surface}
                onChange={(v) => setTech(project.tech.map((g, j) => (j === i ? { ...g, surface: v } : g)))}
              />
            </Field>
            <Field label="Items">
              <Text
                value={group.items.join(", ")}
                onChange={(v) =>
                  setTech(project.tech.map((g, j) => (j === i ? { ...g, items: v.split(",").map((s) => s.trim()).filter(Boolean) } : g)))
                }
              />
            </Field>
          </div>
        ))}
        <p className="ed-hint">Surface names are the labels on the panels in the Scene view.</p>
      </Component>

      <Component title="Highlights">
        <Field label="What was hard">
          <Text
            value={project.highlights.join("\n")}
            onChange={(v) => onChange("highlights", v.split("\n").filter((l) => l.trim()))}
            multiline
          />
        </Field>
      </Component>

      <Component title="Demo (VideoPlayer)">
        <Field label="Loop clip">
          <Text value={project.loopVideoUrl ?? "None — procedural preview at runtime"} />
        </Field>
        <Field label="Full clip">
          <Text value={project.fullVideoUrl ?? "None"} />
        </Field>
      </Component>

      <Component title={`Links (${project.links.length})`}>
        {project.links.map((link: ProjectLink) => (
          <LinkRow key={link.url} label={link.label} url={link.url} />
        ))}
      </Component>
    </>
  );
}

function FolderComponent({ node, data }: { node: { id: string; name: string; children?: unknown[] }; data: InspectorData }) {
  const count = node.children?.length ?? 0;
  const note: Record<string, string> = {
    projects: `${data.projects.length} published`,
    skills: data.skills.length ? `${data.skills.length} skills` : "No skills published yet",
    achievements: data.achievements.length ? `${data.achievements.length} achievements` : "No achievements published yet",
    timeline: data.timeline.length ? `${data.timeline.length} entries` : "No timeline entries published yet",
  };
  return (
    <Component title="Folder">
      <Field label="Children">
        <Text value={String(count)} />
      </Field>
      <p className="ed-hint">{note[node.id] ?? ""}</p>
    </Component>
  );
}

function SkillComponent({ skill }: { skill?: SkillView }) {
  if (!skill) return null;
  return (
    <Component title="Skill (Script)">
      <Field label="Name">
        <Text value={skill.name} />
      </Field>
      <Field label="Category">
        <Text value={skill.category} />
      </Field>
      <Field label="Level">
        <input className="ed-range" type="range" min={1} max={5} value={skill.level} readOnly />
      </Field>
    </Component>
  );
}

function AchievementComponent({ achievement }: { achievement?: AchievementView }) {
  if (!achievement) return null;
  return (
    <Component title="Trophy (Script)">
      <Field label="Title">
        <Text value={achievement.title} />
      </Field>
      <Field label="Event">
        <Text value={achievement.event ?? ""} />
      </Field>
      <Field label="Placement">
        <Text value={achievement.placement ?? ""} />
      </Field>
      <Field label="Awarded">
        <Text value={achievement.awardedOn ?? ""} />
      </Field>
      {achievement.link ? <LinkRow label="Link" url={achievement.link} /> : null}
    </Component>
  );
}

function TimelineComponent({ entry }: { entry?: TimelineView }) {
  if (!entry) return null;
  return (
    <Component title="Timeline (Script)">
      <Field label="Role">
        <Text value={entry.role} />
      </Field>
      <Field label="Org">
        <Text value={entry.org} />
      </Field>
      <Field label="Period">
        <Text value={`${entry.startDate ?? "?"} → ${entry.endDate ?? "present"}`} />
      </Field>
    </Component>
  );
}

function ContactComponent({ profile }: { profile: ProfileView }) {
  return (
    <Component title="Contact (Script)">
      <LinkRow label="Email" url={profile.email ? `mailto:${profile.email}` : null} display={profile.email} />
      <LinkRow label="GitHub" url={profile.githubUrl} />
      <LinkRow label="LinkedIn" url={profile.linkedinUrl} />
    </Component>
  );
}

function SceneComponent({ data }: { data: InspectorData }) {
  return (
    <Component title="Scene Settings">
      <Field label="Stations">
        <Text value={STATIONS.map((s) => s.label).join(" → ")} />
      </Field>
      <Field label="Projects">
        <Text value={String(data.projects.length)} />
      </Field>
      <p className="ed-hint">Press ▶ to run the scene as the headset experience. ⌘P toggles.</p>
    </Component>
  );
}

function LinkRow({ label, url, display }: { label: string; url: string | null | undefined; display?: string | null }) {
  return (
    <Field label={label}>
      {url ? (
        <span className="ed-linkrow">
          <input className="ed-input" value={display ?? url} readOnly />
          <a className="ed-btn ed-btn--small" href={url} target="_blank" rel="noopener noreferrer">
            Open ↗
          </a>
        </span>
      ) : (
        <input className="ed-input" value="—" readOnly />
      )}
    </Field>
  );
}
