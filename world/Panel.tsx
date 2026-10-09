"use client";

import { useEffect, useRef } from "react";

import type { AchievementTier } from "@/lib/data/types";

import type { IslandContent } from "./Island";
import type { Place } from "./layout";

/**
 * What is inside a building.
 *
 * The world gets you here; this is the part that has to read like a portfolio.
 * Real DOM, real headings, real links — so it is selectable, translatable and
 * navigable by keyboard, which a canvas never is.
 */
export function Panel({ place, content, onClose }: { place: Place; content: IslandContent; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    // Keep tabbing inside the panel while it is open.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-ui
      className="absolute inset-0 z-30 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
        className="max-h-[86vh] w-full max-w-2xl overflow-auto rounded-2xl bg-[#1b2530] p-6 ring-1 ring-white/12 sm:p-8"
        style={{ animation: "rise 220ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="ink-label text-[#ffce82]">{place.name}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#f2ead9] sm:text-3xl">{place.sub}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Leave"
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-[#b9ac97] ring-1 ring-white/12 transition hover:text-[#f2ead9] hover:ring-white/30"
          >
            Leave <span className="ml-1 font-mono text-[11px]">Esc</span>
          </button>
        </div>

        <div className="mt-6">
          {place.kind === "about" ? <About content={content} /> : null}
          {place.kind === "project" ? <Project slug={place.id} content={content} /> : null}
          {place.kind === "achievements" ? <Achievements content={content} /> : null}
          {place.kind === "skills" ? <Skills content={content} /> : null}
          {place.kind === "timeline" ? <Timeline content={content} /> : null}
          {place.kind === "contact" ? <Contact content={content} /> : null}
        </div>
      </div>
    </div>
  );
}

const Body = ({ children }: { children: React.ReactNode }) => (
  <p className="text-pretty text-sm leading-relaxed text-[#c6bba8] sm:text-base">{children}</p>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-7">
    <h3 className="ink-label">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white/6 px-2 py-1 text-xs text-[#c6bba8] ring-1 ring-white/10">{children}</span>;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="rounded-lg px-3.5 py-2 text-sm text-[#f2ead9] ring-1 ring-white/15 transition hover:ring-[#ffce82] hover:text-[#ffce82]"
    >
      {children}
    </a>
  );
}

function About({ content }: { content: IslandContent }) {
  const { profile, timeline, projects, achievements } = content;
  const study = timeline.find((t) => t.kind === "education");
  return (
    <>
      <Body>{profile.bio}</Body>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { n: projects.length, l: "projects" },
          { n: achievements.filter((a) => a.placement.includes("Place")).length, l: "hackathon wins" },
          { n: 1, l: "patent" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white/5 p-3 text-center ring-1 ring-white/8">
            <p className="text-2xl font-semibold text-[#ffce82]">{s.n}</p>
            <p className="ink-label mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
      {study ? (
        <Section title="Studying">
          <p className="text-sm text-[#f2ead9]">{study.role}</p>
          <p className="text-sm text-[#b9ac97]">
            {study.org} · {study.when}
          </p>
          {study.bullets[0] ? <p className="mt-1 text-sm text-[#8d8273]">{study.bullets[0]}</p> : null}
        </Section>
      ) : null}
      <Section title="Find me">
        <div className="flex flex-wrap gap-2">
          {profile.githubUrl ? <LinkButton href={profile.githubUrl}>GitHub ↗</LinkButton> : null}
          {profile.linkedinUrl ? <LinkButton href={profile.linkedinUrl}>LinkedIn ↗</LinkButton> : null}
          {profile.email ? <LinkButton href={`mailto:${profile.email}`}>Email ↗</LinkButton> : null}
        </div>
        <p className="ink-label mt-3">{profile.location}</p>
      </Section>
    </>
  );
}

function Project({ slug, content }: { slug: string; content: IslandContent }) {
  const project = content.projects.find((p) => p.slug === slug);
  if (!project) return <Body>Nothing here yet.</Body>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-base text-[#ffce82]">{project.subtitle}</p>
      </div>
      <p className="ink-label mt-2">
        {project.when} · {project.platform} · {project.role}
      </p>
      {project.award ? (
        <p className="mt-4 rounded-xl bg-[#ffce82]/12 px-4 py-3 text-sm text-[#ffd99b] ring-1 ring-[#ffce82]/25">
          🏆 {project.award}
        </p>
      ) : null}
      <div className="mt-5">
        <Body>{project.description}</Body>
      </div>

      <Section title="What I built">
        <ul className="grid gap-2.5">
          {project.highlights.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-[#c6bba8]">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-[#ffce82]" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Built with">
        <div className="grid gap-3 sm:grid-cols-3">
          {project.tech.map((g) => (
            <div key={g.surface}>
              <p className="text-xs font-medium text-[#f2ead9]">{g.surface}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {g.items.map((i) => (
                  <Chip key={i}>{i}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {project.links.length ? (
        <Section title="Links">
          <div className="flex flex-wrap gap-2">
            {project.links.map((l) => (
              <LinkButton key={l.url} href={l.url}>
                {l.label} ↗
              </LinkButton>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

const TIER_STYLE: Record<AchievementTier, { ring: string; glyph: string; label: string }> = {
  patent: { ring: "ring-[#8fd0e8]/40", glyph: "📜", label: "text-[#8fd0e8]" },
  gold: { ring: "ring-[#ffce82]/45", glyph: "🥇", label: "text-[#ffce82]" },
  silver: { ring: "ring-white/25", glyph: "🥈", label: "text-[#d6d2cb]" },
  bronze: { ring: "ring-[#c98f55]/40", glyph: "🥉", label: "text-[#d6a173]" },
  cert: { ring: "ring-[#9ccf9a]/35", glyph: "📘", label: "text-[#9ccf9a]" },
};

function Achievements({ content }: { content: IslandContent }) {
  return (
    <>
      <Body>
        Eight placed finishes across hackathons with thousands of entrants, two Unity certifications, and a published
        patent.
      </Body>
      <ul className="mt-5 grid gap-2">
        {content.achievements.map((a) => {
          const s = TIER_STYLE[a.tier];
          return (
            <li key={a.id} className={`flex items-start gap-3 rounded-xl bg-white/4 p-3.5 ring-1 ${s.ring}`}>
              <span aria-hidden className="text-lg leading-none">
                {s.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xs font-semibold tracking-wide ${s.label}`}>{a.placement}</span>
                <span className="mt-0.5 block text-sm text-[#f2ead9]">{a.title}</span>
                <span className="block text-xs text-[#8d8273]">{a.event}</span>
              </span>
              <span className="ink-label shrink-0">{a.when}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Skills({ content }: { content: IslandContent }) {
  return (
    <>
      <Body>What is actually on the bench — the things I reach for without looking them up.</Body>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {content.skills.map((g) => (
          <div key={g.category}>
            <h3 className="ink-label">{g.category}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {g.items.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Timeline({ content }: { content: IslandContent }) {
  const groups = [
    { kind: "work" as const, title: "Experience" },
    { kind: "education" as const, title: "Education" },
    { kind: "community" as const, title: "Community" },
  ];
  return (
    <>
      {groups.map((g) => {
        const rows = content.timeline.filter((t) => t.kind === g.kind);
        if (!rows.length) return null;
        return (
          <Section key={g.kind} title={g.title}>
            <ul className="grid gap-4">
              {rows.map((t) => (
                <li key={t.id} className="border-l border-white/12 pl-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-medium text-[#f2ead9]">{t.role}</p>
                    {t.current ? (
                      <span className="rounded bg-[#9ccf9a]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#9ccf9a]">now</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-[#b9ac97]">
                    {t.org} · {t.when}
                  </p>
                  {t.bullets.length ? (
                    <ul className="mt-1.5 grid gap-1.5">
                      {t.bullets.map((b) => (
                        <li key={b} className="text-sm leading-relaxed text-[#8d8273]">
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </>
  );
}

function Contact({ content }: { content: IslandContent }) {
  const { profile } = content;
  return (
    <>
      <Body>
        The lamp is always on. Happy to talk about XR, real-time systems, or anything on this island.
      </Body>
      <Section title="Reach me">
        <div className="flex flex-wrap gap-2">
          {profile.email ? <LinkButton href={`mailto:${profile.email}`}>{profile.email}</LinkButton> : null}
          {profile.githubUrl ? <LinkButton href={profile.githubUrl}>GitHub ↗</LinkButton> : null}
          {profile.linkedinUrl ? <LinkButton href={profile.linkedinUrl}>LinkedIn ↗</LinkButton> : null}
        </div>
      </Section>
      <Section title="Based in">
        <p className="text-sm text-[#c6bba8]">{profile.location}</p>
        {profile.phone ? <p className="mt-1 text-sm text-[#8d8273]">{profile.phone}</p> : null}
      </Section>
    </>
  );
}
