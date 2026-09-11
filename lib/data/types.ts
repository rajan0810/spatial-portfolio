import type { ProjectLink, TechGroup } from "@/lib/db/schema";

/**
 * View models. The DB rows carry Date objects, soft-delete bookkeeping and
 * draft flags that no renderer should ever see. These flat, string-only shapes
 * are what cross into client components — smaller RSC payloads, and no way for
 * an unpublished field to leak into the scene by accident.
 */

export type ProjectView = {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  role: string | null;
  year: number | null;
  platform: string | null;
  tech: TechGroup[];
  highlights: string[];
  links: ProjectLink[];
  loopVideoUrl: string | null;
  fullVideoUrl: string | null;
  posterUrl: string | null;
};

export type AchievementView = {
  id: string;
  title: string;
  event: string | null;
  placement: string | null;
  awardedOn: string | null;
  blurb: string | null;
  link: string | null;
};

export type TimelineView = {
  id: string;
  role: string;
  org: string;
  startDate: string | null;
  endDate: string | null;
  blurb: string | null;
};

export type SkillView = {
  id: string;
  name: string;
  category: string;
  level: number;
};

export type ProfileView = {
  name: string;
  headline: string;
  bio: string;
  resumeUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
};

export const CACHE_TAGS = {
  projects: "projects",
  achievements: "achievements",
  timeline: "timeline",
  skills: "skills",
  profile: "profile",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
