import Link from "next/link";

import { getProfile, getProjects } from "@/lib/data";

export const metadata = {
  title: "Rajan Hasija — Full Stack & VR Developer",
  description:
    "Portfolio of Rajan Hasija: full stack development and VR applications for Meta Quest.",
};

/**
 * Flat mode.
 *
 * Not a fallback and not a consolation prize — the same content, server-rendered,
 * with zero WebGL. It is what a recruiter with forty seconds reads, what Google
 * indexes, and what someone on a low-power device or with reduced-motion enabled
 * gets. The experience is the argument; this is the evidence.
 */
export default async function FlatPage() {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header>
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-lg text-ink-dim">{profile.headline}</p>
        {profile.bio ? (
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-ink-dim">
            {profile.bio}
          </p>
        ) : null}

        <nav className="mt-7 flex flex-wrap gap-3" aria-label="Profiles and modes">
          {profile.githubUrl ? (
            <FlatLink href={profile.githubUrl}>GitHub</FlatLink>
          ) : null}
          {profile.linkedinUrl ? (
            <FlatLink href={profile.linkedinUrl}>LinkedIn</FlatLink>
          ) : null}
          {profile.email ? (
            <FlatLink href={`mailto:${profile.email}`}>Email</FlatLink>
          ) : null}
          {profile.resumeUrl ? (
            <FlatLink href={profile.resumeUrl}>Résumé</FlatLink>
          ) : null}
          <Link
            href="/"
            className="panel px-4 py-2 text-sm text-accent-bright transition-colors hover:border-accent-bright"
          >
            Enter the experience →
          </Link>
        </nav>
      </header>

      <section className="mt-16" aria-labelledby="projects-heading">
        <h2
          id="projects-heading"
          className="font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase"
        >
          Projects
        </h2>

        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">Nothing published yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {projects.map((project) => (
              <li key={project.slug}>
                <article className="panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xl font-medium">
                      <Link
                        href={`/flat/projects/${project.slug}`}
                        className="transition-colors hover:text-accent-bright"
                      >
                        {project.title}
                      </Link>
                    </h3>
                    {project.platform ? (
                      <span className="font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                        {project.platform}
                      </span>
                    ) : null}
                  </div>

                  {project.subtitle ? (
                    <p className="mt-1 text-accent-bright">{project.subtitle}</p>
                  ) : null}

                  <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-dim">
                    {project.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/flat/projects/${project.slug}`}
                      className="text-sm text-accent-bright underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent-bright"
                    >
                      Read the case study
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function FlatLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="panel px-4 py-2 text-sm transition-colors hover:border-accent-bright hover:text-accent-bright"
    >
      {children}
    </a>
  );
}
