/**
 * The shapes the site renders.
 *
 * These are the canonical types: the content module in lib/content implements
 * them directly, which is why the site needs no database to render. When the
 * admin portal returns, the database schema is written to match *these* — not
 * the other way round.
 */

export type TechGroup = { surface: string; items: string[] };

export type ProjectLink = {
  type: "github" | "linkedin" | "live" | "youtube" | "other";
  url: string;
  label: string;
};

export type ProfileView = {
  name: string;
  headline: string;
  bio: string;
  location: string;
  resumeUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
  phone: string | null;
};

export type ProjectView = {
  slug: string;
  title: string;
  subtitle: string;
  year: number;
  when: string;
  platform: string;
  role: string;
  description: string;
  tech: TechGroup[];
  highlights: string[];
  links: ProjectLink[];
  /** The prize it won, if it won one. */
  award: string | null;
};

export type AchievementTier = "patent" | "gold" | "silver" | "bronze" | "cert";

export type AchievementView = {
  id: string;
  title: string;
  event: string;
  placement: string;
  when: string;
  tier: AchievementTier;
};

export type TimelineKind = "work" | "education" | "community";

export type TimelineView = {
  id: string;
  kind: TimelineKind;
  role: string;
  org: string;
  when: string;
  current: boolean;
  bullets: string[];
};

export type SkillGroupView = { category: string; items: string[] };
