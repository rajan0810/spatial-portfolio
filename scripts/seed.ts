/**
 * Seeds the phase-1 content: the profile singleton, the admin allow-list, and
 * the JustiX project. Idempotent — upserts on natural keys, so re-running only
 * updates.
 *
 *   npm run db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { profile, projects, type TechGroup } from "../lib/db/schema";

const JUSTIX_TECH: TechGroup[] = [
  { surface: "VR Client", items: ["Unity", "C#", "Oculus SDK"] },
  { surface: "Mobile", items: ["Android (Java/Kotlin)", "XML"] },
  { surface: "Backend", items: ["FastAPI (Python)", "Node.js", "Socket.io"] },
];

const GITHUB_PROFILE = "https://github.com/rajan0810";
// Inferred from the LinkedIn post URL — worth confirming.
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/rajan-hasija-b0299a28a";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — is .env.local present?");
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql);

  try {
    // -- admin allow-list ---------------------------------------------------
    // Read from env rather than hardcoded: this repo is public, and the email
    // should not be committed.
    if (adminEmail) {
      await sql`
        insert into public.admin_emails (email)
        values (${adminEmail})
        on conflict (email) do nothing
      `;
      console.log("✓ admin allow-list");
    } else {
      console.warn("⚠ ADMIN_EMAIL not set — skipping admin allow-list");
    }

    // -- profile ------------------------------------------------------------
    await db
      .insert(profile)
      .values({
        id: "me",
        name: "Rajan Hasija",
        // TODO(rajan): replace with your own one-line headline.
        headline: "Full Stack Developer building for Meta Quest",
        bio: "",
        githubUrl: GITHUB_PROFILE,
        linkedinUrl: LINKEDIN_PROFILE,
        email: adminEmail ?? null,
      })
      .onConflictDoUpdate({
        target: profile.id,
        set: {
          name: "Rajan Hasija",
          githubUrl: GITHUB_PROFILE,
          linkedinUrl: LINKEDIN_PROFILE,
        },
      });
    console.log("✓ profile");

    // -- JustiX -------------------------------------------------------------
    const justix = {
      slug: "justix",
      title: "JustiX",
      subtitle: "Trial by fire, against an adversarial AI",
      description:
        "JustiX is an immersive, AI-driven litigation training platform. Unlike standard legal AI " +
        "tools that act as passive “digital clerks” for summarization, JustiX provides a “Trial by " +
        "Fire” — allowing law students and professionals to argue cases against an adversarial AI " +
        "in a high-fidelity VR courtroom environment.",
      role: "Full Stack & XR Developer",
      platform: "Meta Quest · Android · Web",
      tech: JUSTIX_TECH,
      // Deliberately obvious placeholders: the real engineering story is the
      // highest-value copy on the site and has to come from Rajan, not be invented.
      highlights: [
        "⚠︎ Placeholder — replace with a real engineering detail (a frame-budget win, with numbers)",
        "⚠︎ Placeholder — replace with a hard problem you solved (adversarial AI latency? speech pipeline?)",
        "⚠︎ Placeholder — replace with a cross-surface challenge (Quest ↔ phone ↔ socket sync)",
      ],
      links: [
        {
          type: "github" as const,
          url: "https://github.com/rajan0810/JustiX",
          label: "View source",
        },
        {
          type: "linkedin" as const,
          // utm_* / rcm tracking params stripped.
          url: "https://www.linkedin.com/posts/rajan-hasija-b0299a28a_justix-legaltech-adversarialai-activity-7434279999395807232-8XuK",
          label: "Read the writeup",
        },
      ],
      sortOrder: 0,
      published: true,
    };

    await db
      .insert(projects)
      .values(justix)
      .onConflictDoUpdate({ target: projects.slug, set: justix });
    console.log("✓ project: justix");

    console.log("\nSeed complete.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✗ seed failed");
  console.error(error);
  process.exit(1);
});
