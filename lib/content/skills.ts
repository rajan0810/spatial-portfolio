import type { SkillGroupView } from "@/lib/data/types";

/** The workshop wall. Grouped the way the work actually splits. */
export const SKILLS: SkillGroupView[] = [
  { category: "Languages", items: ["C#", "C++", "C", "Python", "Java", "JavaScript", "Go", "Swift", "SQL"] },
  { category: "XR & Games", items: ["Unity Engine", "OpenXR", "Meta SDK", "AR Foundation", "Google ARCore", "Blender"] },
  { category: "Frameworks", items: ["Node.js", "React.js", "Next.js", "Gin", "SwiftUI"] },
  { category: "Data", items: ["PostgreSQL", "MySQL", "Redis", "Supabase"] },
  { category: "Cloud & Ops", items: ["Docker", "Render"] },
  { category: "ML & Analysis", items: ["NumPy", "Pandas", "RStudio", "MATLAB"] },
];
