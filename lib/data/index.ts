import { and, asc, eq, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import {
  achievements,
  profile,
  projects,
  skills,
  timeline,
  type Achievement,
  type Project,
  type Profile,
  type Skill,
  type TimelineEntry,
} from "@/lib/db/schema";

import { CACHE_TAGS } from "./types";
import type {
  AchievementView,
  ProfileView,
  ProjectView,
  SkillView,
  TimelineView,
} from "./types";

/**
 * The ONLY module that reads content. Both front-ends — the spatial Experience
 * and Flat mode — consume these functions and nothing else. Keeping a single
 * access layer is what stops the two modes from drifting into different sites.
 *
 * Every function filters `published = true and deleted_at is null`. That filter
 * is the actual access control on this path, because the Drizzle connection
 * authenticates as a privileged role and bypasses RLS (see lib/db/index.ts).
 */

const live = <T extends { published: unknown; deletedAt: unknown }>(t: T) =>
  and(eq(t.published as never, true), isNull(t.deletedAt as never));

// -- mappers ----------------------------------------------------------------

const toProjectView = (row: Project): ProjectView => ({
  slug: row.slug,
  title: row.title,
  subtitle: row.subtitle,
  description: row.description,
  role: row.role,
  year: row.year,
  platform: row.platform,
  tech: row.tech,
  highlights: row.highlights,
  links: row.links,
  loopVideoUrl: row.loopVideoUrl,
  fullVideoUrl: row.fullVideoUrl,
  posterUrl: row.posterUrl,
});

const toAchievementView = (row: Achievement): AchievementView => ({
  id: row.id,
  title: row.title,
  event: row.event,
  placement: row.placement,
  awardedOn: row.awardedOn,
  blurb: row.blurb,
  link: row.link,
});

const toTimelineView = (row: TimelineEntry): TimelineView => ({
  id: row.id,
  role: row.role,
  org: row.org,
  startDate: row.startDate,
  endDate: row.endDate,
  blurb: row.blurb,
});

const toSkillView = (row: Skill): SkillView => ({
  id: row.id,
  name: row.name,
  category: row.category,
  level: row.level,
});

const toProfileView = (row: Profile): ProfileView => ({
  name: row.name,
  headline: row.headline,
  bio: row.bio,
  resumeUrl: row.resumeUrl,
  githubUrl: row.githubUrl,
  linkedinUrl: row.linkedinUrl,
  email: row.email,
});

/** Shown before the DB has ever been seeded, so the site never renders blank. */
const FALLBACK_PROFILE: ProfileView = {
  name: "Rajan Hasija",
  headline: "Full Stack Developer — VR on Meta Quest",
  bio: "",
  resumeUrl: null,
  githubUrl: null,
  linkedinUrl: null,
  email: null,
};

// -- queries ----------------------------------------------------------------

export async function getProjects(): Promise<ProjectView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.projects);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(projects)
    .where(live(projects))
    .orderBy(asc(projects.sortOrder), asc(projects.title));

  return rows.map(toProjectView);
}

export async function getProjectBySlug(
  slug: string,
): Promise<ProjectView | null> {
  "use cache";
  cacheTag(CACHE_TAGS.projects);
  cacheLife("hours");

  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), live(projects)))
    .limit(1);

  return row ? toProjectView(row) : null;
}

export async function getAchievements(): Promise<AchievementView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.achievements);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(achievements)
    .where(live(achievements))
    .orderBy(asc(achievements.sortOrder));

  return rows.map(toAchievementView);
}

export async function getTimeline(): Promise<TimelineView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.timeline);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(timeline)
    .where(live(timeline))
    .orderBy(asc(timeline.sortOrder));

  return rows.map(toTimelineView);
}

export async function getSkills(): Promise<SkillView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.skills);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(skills)
    .where(live(skills))
    .orderBy(asc(skills.category), asc(skills.sortOrder));

  return rows.map(toSkillView);
}

export async function getProfile(): Promise<ProfileView> {
  "use cache";
  cacheTag(CACHE_TAGS.profile);
  cacheLife("hours");

  const [row] = await db.select().from(profile).limit(1);
  return row ? toProfileView(row) : FALLBACK_PROFILE;
}
