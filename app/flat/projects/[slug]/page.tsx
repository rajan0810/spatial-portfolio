import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectBySlug, getProjects } from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Per-project case study. Indexable, shareable, and the place the full-quality
 * demo video lives — the in-world panel only ever plays a small loop.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) return { title: "Not found" };

  return {
    title: `${project.title} — Rajan Hasija`,
    description: project.subtitle ?? project.description.slice(0, 155),
  };
}

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectCaseStudy({ params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <Link
        href="/flat"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase transition-colors hover:text-ink"
      >
        ← All projects
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            {project.title}
          </h1>
          {project.year ? (
            <span className="font-mono text-xs text-ink-faint">{project.year}</span>
          ) : null}
        </div>

        {project.subtitle ? (
          <p className="mt-3 text-lg text-accent-bright">{project.subtitle}</p>
        ) : null}

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {project.role ? (
            <div>
              <dt className="font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                Role
              </dt>
              <dd className="mt-0.5 text-ink-dim">{project.role}</dd>
            </div>
          ) : null}
          {project.platform ? (
            <div>
              <dt className="font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                Platform
              </dt>
              <dd className="mt-0.5 text-ink-dim">{project.platform}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {/* Full-quality clip, behind a poster and never preloaded. */}
      {project.fullVideoUrl ? (
        <figure className="mt-10">
          <video
            controls
            playsInline
            preload="none"
            poster={project.posterUrl ?? undefined}
            className="w-full rounded-xl border border-accent/20"
          >
            <source src={project.fullVideoUrl} type="video/mp4" />
          </video>
          <figcaption className="mt-2 text-xs text-ink-faint">
            {project.title} — recorded demo
          </figcaption>
        </figure>
      ) : null}

      <div className="mt-10 text-pretty leading-relaxed text-ink-dim">
        {project.description}
      </div>

      {project.highlights.length > 0 ? (
        <section className="mt-12" aria-labelledby="engineering-heading">
          <h2
            id="engineering-heading"
            className="font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase"
          >
            What was hard
          </h2>
          <ul className="mt-4 grid gap-3">
            {project.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3 text-sm text-ink-dim">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.tech.length > 0 ? (
        <section className="mt-12" aria-labelledby="tech-heading">
          <h2
            id="tech-heading"
            className="font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase"
          >
            Built with
          </h2>
          {/* Grouped by surface, matching the triptych in the experience: the
              grouping is what shows the range. */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {project.tech.map((group) => (
              <div key={group.surface} className="panel p-4">
                <h3 className="text-sm text-ink">{group.surface}</h3>
                <ul className="mt-2 grid gap-1 text-sm text-ink-dim">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {project.links.length > 0 ? (
        <nav className="mt-12 flex flex-wrap gap-3" aria-label={`${project.title} links`}>
          {project.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="panel px-4 py-2 text-sm transition-colors hover:border-accent-bright hover:text-accent-bright"
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </main>
  );
}
