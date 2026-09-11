"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { rail } from "@/lib/store/rail";
import { STATIONS, stationWeight } from "@/lib/stations";

/**
 * All prose in the experience.
 *
 * Sits above the canvas and carries the typography, because DOM text is crisp,
 * selectable, translatable and reachable by assistive tech in a way text
 * rendered into WebGL is not.
 *
 * Two details that matter:
 *  - Opacity and transform are written directly to style in a rAF loop, not
 *    through React state. Fading four sections at 60fps through the reconciler
 *    would cost more than the entire 3D scene.
 *  - Inactive stations get `inert` + `aria-hidden`, so keyboard focus can never
 *    land on a link that is invisible on screen, and a screen reader reads only
 *    the station you are at. Without this, an overlay like this is an
 *    accessibility trap.
 */
export function Overlay({
  profile,
  projects,
}: {
  profile: ProfileView;
  projects: ProjectView[];
}) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      for (let i = 0; i < refs.current.length; i += 1) {
        const el = refs.current[i];
        if (!el) continue;

        const weight = stationWeight(rail.progress, i, 0.62);
        el.style.opacity = weight.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - weight) * 26).toFixed(1)}px, 0)`;

        const active = weight > 0.5;
        // Guarded: touching inert/aria-hidden every frame would thrash the
        // accessibility tree.
        if (el.dataset.active !== String(active)) {
          el.dataset.active = String(active);
          el.inert = !active;
          el.setAttribute("aria-hidden", String(!active));
          el.style.pointerEvents = active ? "auto" : "none";
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const featured = projects[0];

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* Scrim: guarantees text contrast over video and the floor grid. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[58vh] bg-gradient-to-t from-void via-void/85 to-transparent"
      />

      <StationLayer ref={(el) => void (refs.current[0] = el)} label="Boot">
        <p className="font-mono text-xs tracking-[0.3em] text-ink-faint uppercase">
          Tracking initialised
        </p>
      </StationLayer>

      <StationLayer ref={(el) => void (refs.current[1] = el)} label="Home">
        <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-4 max-w-xl text-balance text-lg text-ink-dim sm:text-xl">
          {profile.headline}
        </p>
        <nav className="mt-7 flex flex-wrap items-center gap-3" aria-label="Profiles">
          {profile.githubUrl ? (
            <OverlayLink href={profile.githubUrl}>GitHub</OverlayLink>
          ) : null}
          {profile.linkedinUrl ? (
            <OverlayLink href={profile.linkedinUrl}>LinkedIn</OverlayLink>
          ) : null}
          <OverlayLink href="/flat" internal>
            Flat mode
          </OverlayLink>
        </nav>
      </StationLayer>

      <StationLayer ref={(el) => void (refs.current[2] = el)} label="JustiX">
        {featured ? <ProjectCopy project={featured} /> : null}
      </StationLayer>

      <StationLayer ref={(el) => void (refs.current[3] = el)} label="Contact">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Come build something spatial
        </h2>
        <nav className="mt-6 flex flex-wrap items-center gap-3" aria-label="Contact">
          {profile.email ? (
            <OverlayLink href={`mailto:${profile.email}`}>
              {profile.email}
            </OverlayLink>
          ) : null}
          {profile.githubUrl ? (
            <OverlayLink href={profile.githubUrl}>GitHub</OverlayLink>
          ) : null}
          {profile.linkedinUrl ? (
            <OverlayLink href={profile.linkedinUrl}>LinkedIn</OverlayLink>
          ) : null}
        </nav>
      </StationLayer>
    </div>
  );
}

function ProjectCopy({ project }: { project: ProjectView }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {project.title}
        </h2>
        {project.platform ? (
          <span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {project.platform}
          </span>
        ) : null}
      </div>

      {project.subtitle ? (
        <p className="mt-2 text-lg text-accent-bright">{project.subtitle}</p>
      ) : null}

      <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-ink-dim sm:text-base">
        {project.description}
      </p>

      {project.highlights.length > 0 ? (
        <ul className="mt-5 grid max-w-2xl gap-2 text-sm text-ink-dim">
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {project.links.length > 0 ? (
        <nav
          className="mt-6 flex flex-wrap items-center gap-3"
          aria-label={`${project.title} links`}
        >
          {project.links.map((link) => (
            <OverlayLink key={link.url} href={link.url}>
              {link.label}
            </OverlayLink>
          ))}
        </nav>
      ) : null}
    </>
  );
}

function StationLayer({
  ref,
  label,
  children,
}: {
  ref: (el: HTMLElement | null) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      ref={ref}
      aria-label={label}
      className="absolute inset-x-0 bottom-0 px-6 pb-16 sm:px-10 sm:pb-20"
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

function OverlayLink({
  href,
  children,
  internal = false,
}: {
  href: string;
  children: ReactNode;
  internal?: boolean;
}) {
  return (
    <a
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="panel px-4 py-2 text-sm text-ink transition-colors duration-200 hover:border-accent-bright hover:text-accent-bright"
    >
      {children}
    </a>
  );
}
