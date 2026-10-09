import type { ProfileView } from "@/lib/data/types";

/**
 * Who this is. The canonical copy lives here, in the repo, so the site renders
 * with no database at all; a database, when one exists, overrides it.
 */
export const PROFILE: ProfileView = {
  name: "Rajan Hasija",
  // TODO(rajan): yours to rewrite — this is my read of the evidence, not your voice.
  headline: "XR and full-stack developer. Unity in the headset, Go and Node behind it.",
  bio:
    "Final-year Computer Science at VIT Vellore. I build things people step inside — VR and " +
    "mixed-reality apps on Meta Quest — and the services that make them work: real-time audio " +
    "loops, AI pipelines, and the backends underneath. Eight hackathon wins, one published patent, " +
    "and a habit of shipping the whole stack rather than half of it.",
  location: "Ghaziabad, Uttar Pradesh, India",
  resumeUrl: null,
  githubUrl: "https://github.com/rajan0810",
  // Inferred from a LinkedIn post URL — worth confirming.
  linkedinUrl: "https://www.linkedin.com/in/rajan-hasija-b0299a28a",
  email: "hasijarajan0810@gmail.com",
  phone: "+91 8368994540",
};
