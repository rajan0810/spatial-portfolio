import { getProfile, getProjects } from "@/lib/data";
import { ExperienceShell } from "@/ui/ExperienceShell";

/**
 * The Experience. A server component: data is fetched here through lib/data and
 * handed to the client shell as plain props, so no Supabase client and no
 * database code reaches the browser.
 */
export default async function ExperiencePage() {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);

  return <ExperienceShell profile={profile} projects={projects} />;
}
