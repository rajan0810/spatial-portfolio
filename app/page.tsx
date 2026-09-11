import { Suspense } from "react";

import { getAchievements, getProfile, getProjects, getSkills, getTimeline } from "@/lib/data";
import { getDrops } from "@/lib/data/drops";
import { Dig } from "@/dig/Dig";

/**
 * The Dig. A server component: content comes through lib/data (cached), the
 * pile through lib/data/drops (never cached — it changes by the minute), and
 * everything is handed to the client as plain props. No database code reaches
 * the browser; Realtime keeps the pile moving after first paint.
 *
 * The pile read is dynamic, so it sits behind a Suspense boundary: the shell
 * streams first and the tokens arrive a beat later.
 */
export default async function DigPage() {
  const [profile, projects, achievements, skills, timeline] = await Promise.all([
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getTimeline(),
  ]);

  return (
    <Suspense fallback={<Ground />}>
      <Pile profile={profile} projects={projects} achievements={achievements} skills={skills} timeline={timeline} />
    </Suspense>
  );
}

async function Pile(props: Omit<React.ComponentProps<typeof Dig>, "initialTokens" | "initialTotal">) {
  const pile = await getDrops();
  return <Dig {...props} initialTokens={pile.tokens} initialTotal={pile.total} />;
}

/** What streams first: dark ground and a line, until the pile arrives. */
function Ground() {
  return (
    <div className="min-h-dvh bg-earth" aria-busy="true">
      <p className="ink-label p-6">Excavating…</p>
    </div>
  );
}
