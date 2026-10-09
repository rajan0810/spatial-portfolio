import type { TimelineView } from "@/lib/data/types";

/** Work, study and the clubs. `kind` decides which column it lands in. */
export const TIMELINE: TimelineView[] = [
  {
    id: "qnu",
    kind: "work",
    role: "AR/VR Developer Intern",
    org: "QNU Labs",
    when: "March 2026 — present",
    current: true,
    bullets: [
      "Engineered a mobile AR analytics platform in Unity that visualises live enterprise security telemetry — AI agents, APIs, MCP servers, LLM providers — as an interactive 3D carousel with risk-tier colour coding, tap-to-inspect detail cards and real-time REST polling.",
      "Building a gamified security-training module end to end: persistent XP, rank and badge progression, a dynamic level-map UI, and narrated interactive 3D lessons with branching scenarios across a nine-level curriculum.",
    ],
  },
  {
    id: "hpe",
    kind: "work",
    role: "Career Preview Program (CPP)",
    org: "Hewlett Packard Enterprise",
    when: "February 2026 — July 2026",
    current: false,
    bullets: [
      "Deep-dive research into QUIC protocol invariants and handshake mechanics, to tell encrypted QUIC streams apart from generic UDP traffic.",
      "Developing a method to extract SNI metadata and use machine learning to classify streams as video, VoIP or web — then police them with Hierarchical Token Bucket queues.",
    ],
  },
  {
    id: "braindance",
    kind: "work",
    role: "XR Developer Intern",
    org: "BrainDance Pvt. Ltd.",
    when: "January 2025 — May 2025",
    current: false,
    bullets: [
      "Helped build a gamified learning environment that teaches school students textbook concepts through hands-on VR activities.",
      "Developed the interactive VR components with the OpenXR Interaction Toolkit, and contributed to the app's UI/UX.",
    ],
  },
  {
    id: "vit",
    kind: "education",
    role: "B.Tech, Computer Science and Engineering",
    org: "Vellore Institute of Technology",
    when: "August 2023 — August 2027",
    current: true,
    bullets: ["CGPA 9.53 · Final year"],
  },
  {
    id: "dps-12",
    kind: "education",
    role: "High School",
    org: "Delhi Public School, Ghaziabad",
    when: "2021 — 2023",
    current: false,
    bullets: ["97.6%"],
  },
  {
    id: "dps-10",
    kind: "education",
    role: "Matriculation",
    org: "Delhi Public School, Ghaziabad",
    when: "2017 — 2021",
    current: false,
    bullets: ["97.2%"],
  },
  {
    id: "iste",
    kind: "community",
    role: "Core Committee Member",
    org: "ISTE — VIT Student Chapter",
    when: "May 2024 — July 2025",
    current: false,
    bullets: [
      "Ran hackathons, ideathons and workshops, and contributed to the chapter's own AR project for STEM students.",
      "Led publicity and outreach for the chapter's events.",
    ],
  },
  {
    id: "cubing",
    kind: "community",
    role: "Senior Core Member",
    org: "Cubing Club — VIT",
    when: "March 2024 — February 2025",
    current: false,
    bullets: [
      "Led PR and marketing for VIT's cubing events.",
      "Coordinated World Cube Association events on campus, handling promotion and execution.",
    ],
  },
];
