import { getAchievements, getProfile, getProjects, getSkills, getTimeline } from "@/lib/data";
import { EditorShell } from "@/ui/editor/EditorShell";

/**
 * The editor. A server component: every table is read here through lib/data
 * and handed to the client as plain props, so no database code reaches the
 * browser. The inspector shows all of it; the scene renders what has stations.
 */
export default async function EditorPage() {
  const [profile, projects, skills, achievements, timeline] = await Promise.all([
    getProfile(),
    getProjects(),
    getSkills(),
    getAchievements(),
    getTimeline(),
  ]);

  return <EditorShell profile={profile} projects={projects} skills={skills} achievements={achievements} timeline={timeline} />;
}
