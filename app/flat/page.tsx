import Link from "next/link";

import { getAchievements, getProfile, getProjects, getSkills, getTimeline } from "@/lib/data";

export const metadata = {
  title: "Rajan Hasija — XR & full-stack developer",
  description:
    "Projects, awards, experience and skills. VR and mixed reality on Meta Quest, with Go, Node and Swift behind them.",
};

/**
 * The whole portfolio as a page.
 *
 * Not a fallback: the same content, server-rendered, with no canvas and no
 * interaction required. What Google indexes, what a screen reader reads top to
 * bottom, and what someone with forty seconds actually wants.
 */
export default async function FlatPage() {
  const [profile, projects, achievements, skills, timeline] = await Promise.all([
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getTimeline(),
  ]);

  const work = timeline.filter((t) => t.kind === "work");
  const education = timeline.filter((t) => t.kind === "education");
  const community = timeline.filter((t) => t.kind === "community");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
        <p className="mt-3 text-lg text-ink-dim">{profile.headline}</p>
        <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-ink-dim">{profile.bio}</p>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Links">
          {profile.githubUrl ? <Pill href={profile.githubUrl}>GitHub</Pill> : null}
          {profile.linkedinUrl ? <Pill href={profile.linkedinUrl}>LinkedIn</Pill> : null}
          {profile.email ? <Pill href={`mailto:${profile.email}`}>{profile.email}</Pill> : null}
          <Link
            href="/"
            className="rounded-lg bg-lamp px-3.5 py-2 text-sm font-medium text-[#2a1f12] transition hover:opacity-90"
          >
            Explore the island →
          </Link>
        </nav>
        <p className="ink-label mt-4">{profile.location}</p>
      </header>

      <Section id="projects" title="Projects">
        <ul className="grid gap-8">
          {projects.map((p) => (
            <li key={p.slug}>
              <article>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-xl font-medium">{p.title}</h3>
                  <span className="ink-label">{p.when}</span>
                </div>
                <p className="mt-0.5 text-lamp">{p.subtitle}</p>
                {p.award ? <p className="mt-2 text-sm text-ink-dim">🏆 {p.award}</p> : null}
                <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-dim">{p.description}</p>
                <ul className="mt-3 grid gap-2">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-ink-faint">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lamp" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {p.tech.map((g) => (
                    <p key={g.surface} className="text-xs text-ink-faint">
                      <span className="text-ink-dim">{g.surface}:</span> {g.items.join(", ")}
                    </p>
                  ))}
                </div>
                {p.links.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.links.map((l) => (
                      <Pill key={l.url} href={l.url}>
                        {l.label}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="awards" title="Awards & certifications">
        <ul className="grid gap-2">
          {achievements.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-lamp">{a.placement}</span>
              <span className="text-ink">{a.title}</span>
              <span className="text-ink-faint">· {a.event}</span>
              <span className="ink-label ml-auto">{a.when}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="experience" title="Experience">
        <Entries rows={work} />
      </Section>

      <Section id="skills" title="Skills">
        <dl className="grid gap-3 sm:grid-cols-2">
          {skills.map((g) => (
            <div key={g.category}>
              <dt className="ink-label">{g.category}</dt>
              <dd className="mt-1 text-sm text-ink-dim">{g.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="education" title="Education">
        <Entries rows={education} />
      </Section>

      <Section id="community" title="Community">
        <Entries rows={community} />
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14" aria-labelledby={id}>
      <h2 id={id} className="ink-label">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Entries({ rows }: { rows: Awaited<ReturnType<typeof getTimeline>> }) {
  return (
    <ul className="grid gap-6">
      {rows.map((t) => (
        <li key={t.id}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-medium">{t.role}</h3>
            <span className="text-sm text-ink-dim">· {t.org}</span>
            <span className="ink-label ml-auto">{t.when}</span>
          </div>
          {t.bullets.length ? (
            <ul className="mt-2 grid gap-1.5">
              {t.bullets.map((b) => (
                <li key={b} className="text-sm leading-relaxed text-ink-faint">
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Pill({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="rounded-lg px-3.5 py-2 text-sm ring-1 ring-white/15 transition hover:text-lamp hover:ring-lamp/60"
    >
      {children}
    </a>
  );
}
