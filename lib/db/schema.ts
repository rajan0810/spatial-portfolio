import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Tech is grouped by surface rather than a flat tag list. For a project that
 * spans a headset, a phone and a server, the grouping *is* the story — it shows
 * range that a flat list of logos flattens away.
 */
export type TechGroup = {
  surface: string;
  items: string[];
};

export type ProjectLink = {
  type: "github" | "linkedin" | "live" | "youtube" | "sidequest" | "other";
  url: string;
  label: string;
};

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  /** Long-form prose. Rendered as MDX from phase 3 onward. */
  description: text("description").notNull().default(""),
  role: text("role"),
  year: integer("year"),
  platform: text("platform"),
  tech: jsonb("tech").$type<TechGroup[]>().notNull().default([]),
  /** The engineering story: what was genuinely hard. The highest-value copy. */
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  links: jsonb("links").$type<ProjectLink[]>().notNull().default([]),
  /** ~10s muted loop, <3MB — textured onto the in-world panel. */
  loopVideoUrl: text("loop_video_url"),
  /** Full-quality clip for the flat-mode case study, lazy-loaded. */
  fullVideoUrl: text("full_video_url"),
  posterUrl: text("poster_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  event: text("event"),
  placement: text("placement"),
  awardedOn: date("awarded_on"),
  blurb: text("blurb"),
  link: text("link"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timeline = pgTable("timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  org: text("org").notNull(),
  startDate: date("start_date"),
  /** Null means "present". */
  endDate: date("end_date"),
  blurb: text("blurb"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** e.g. "XR", "Frontend", "Backend", "Tooling" — drives toolbench clustering. */
  category: text("category").notNull(),
  level: integer("level").notNull().default(3),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Singleton table. `id` is pinned to 'me' by a check constraint in
 * lib/db/policies.sql so a second row cannot exist.
 */
export const profile = pgTable("profile", {
  id: text("id").primaryKey().default("me"),
  name: text("name").notNull(),
  headline: text("headline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  resumeUrl: text("resume_url"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type TimelineEntry = typeof timeline.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Profile = typeof profile.$inferSelect;

/**
 * A visitor's token in the dig: an emoji and a word, dropped once, kept forever.
 *
 * Fully public: everything in this row is meant to be seen. Anything that must
 * not be seen — the IP hash used for rate limiting and the secret that lets
 * the dropper write the rest pose once — lives in `dropSecrets`, a separate
 * table with no public policy at all. Keeping secrets out of this table is what
 * lets Realtime broadcast inserts and updates on it without a leak.
 */
export const drops = pgTable(
  "drops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emoji: text("emoji").notNull(),
    word: text("word").notNull(),
    /** World-space rest pose, written exactly once by the dropping client. */
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    angle: real("angle").notNull().default(0),
    settled: boolean("settled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("drops_created_idx").on(t.createdAt)],
);

export const dropSecrets = pgTable(
  "drop_secrets",
  {
    dropId: uuid("drop_id").primaryKey().references(() => drops.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    editToken: text("edit_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drop_secrets_ip_idx").on(t.ipHash, t.createdAt)],
);

export type Drop = typeof drops.$inferSelect;
