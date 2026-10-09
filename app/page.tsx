import { getAchievements, getProfile, getProjects, getSkills, getTimeline } from "@/lib/data";
import { Island } from "@/world/Island";

export const metadata = {
  title: "Rajan Hasija — an island of the work",
  description:
    "Walk around a small island where every building is a project: a VR courtroom, a presentation rehearsal hall, a link shortener, a mixed-reality factory.",
};

/**
 * The island. A server component: content comes through lib/data and is handed
 * to the client as plain props, so the world has nothing to fetch once it loads.
 */
export default async function IslandPage() {
  const [profile, projects, achievements, skills, timeline] = await Promise.all([
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getTimeline(),
  ]);

  return (
    <Island profile={profile} projects={projects} achievements={achievements} skills={skills} timeline={timeline} />
  );
}
