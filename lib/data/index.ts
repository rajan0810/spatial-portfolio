import { ACHIEVEMENTS, PROFILE, PROJECTS, SKILLS, TIMELINE } from "@/lib/content";

import type {
  AchievementView,
  ProfileView,
  ProjectView,
  SkillGroupView,
  TimelineKind,
  TimelineView,
} from "./types";

/**
 * The only module that reads content, and the one both front-ends consume —
 * the island and flat mode. Keeping a single access layer is what stops the
 * two from drifting into different sites.
 *
 * Content ships in the repo (lib/content). There is deliberately no database
 * on this path: a portfolio changes a few times a year, and a dead or paused
 * database should never be able to take the site down. When the admin portal
 * arrives it slots in here, behind the same functions.
 */

export async function getProfile(): Promise<ProfileView> {
  return PROFILE;
}

export async function getProjects(): Promise<ProjectView[]> {
  return PROJECTS;
}

export async function getProject(slug: string): Promise<ProjectView | null> {
  return PROJECTS.find((p) => p.slug === slug) ?? null;
}

export async function getAchievements(): Promise<AchievementView[]> {
  return ACHIEVEMENTS;
}

export async function getSkills(): Promise<SkillGroupView[]> {
  return SKILLS;
}

export async function getTimeline(kind?: TimelineKind): Promise<TimelineView[]> {
  return kind ? TIMELINE.filter((t) => t.kind === kind) : TIMELINE;
}

export type {
  AchievementView,
  ProfileView,
  ProjectView,
  SkillGroupView,
  TimelineView,
} from "./types";
