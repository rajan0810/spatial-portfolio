import type { ProjectView } from "@/lib/data/types";

/**
 * The work. Order is the order they appear across the island, newest first.
 * `place` ties each one to a building in world/layout.ts.
 */
export const PROJECTS: ProjectView[] = [
  {
    slug: "justix",
    title: "JustiX",
    subtitle: "A flight simulator for lawyers",
    year: 2026,
    when: "February 2026",
    platform: "Meta Quest · Android · Web",
    role: "Full Stack & XR Developer",
    description:
      "A VR courtroom where law students argue a live case against an adversarial AI — an " +
      "immersive way to practise litigation rather than read about it.",
    tech: [
      { surface: "VR Client", items: ["Unity", "C#", "Meta SDK"] },
      { surface: "Backend", items: ["Node.js", "Socket.io", "Python"] },
      { surface: "AI", items: ["OpenAI", "RAG", "Speech-to-text", "Text-to-speech"] },
    ],
    highlights: [
      "The VR client records your voice in the headset, sends it up, and plays the AI's reply through the right character — judge or opposing counsel — with the response driving their animation.",
      "The backend runs the whole courtroom as one real-time loop: speech-to-text into the AI into text-to-speech, streaming the reply audio back to the headset over a persistent connection.",
      "Decoupled on purpose: the mobile app carries the heavy work — PDF parsing, LLM calls — so the headset only ever handles low-latency audio and visuals.",
      "Retrieval-Augmented Generation grounds the opposing lawyer in real constitutional databases, and the case evidence shows up as a clipboard you can pick up.",
    ],
    links: [
      { type: "github", url: "https://github.com/rajan0810/JustiX", label: "View source" },
      {
        type: "linkedin",
        url: "https://www.linkedin.com/posts/rajan-hasija-b0299a28a_justix-legaltech-adversarialai-activity-7434279999395807232-8XuK",
        label: "Read the writeup",
      },
    ],
    award: null,
  },
  {
    slug: "awaaz",
    title: "Awaaz",
    subtitle: "Rehearse a talk to an audience that talks back",
    year: 2025,
    when: "September 2025",
    platform: "Meta Quest · Web",
    role: "XR & Backend Developer",
    description:
      "Upload your slide deck, put on a headset, and present to a virtual audience that " +
      "interrupts with questions — then get scored on how you answered them.",
    tech: [
      { surface: "VR Client", items: ["Unity", "Meta Quest"] },
      { surface: "Backend", items: ["Node.js", "Supabase"] },
      { surface: "Web & AI", items: ["React.js", "ElevenLabs API", "Speech-to-text"] },
    ],
    highlights: [
      "Built the VR side in Unity for Quest: slide display, NPC audience members that ask their questions out loud, and in-headset voice recording piped to a speech-to-text API.",
      "The backend turns an uploaded PDF into a VR session — pulling the text from each slide, rendering every page to an image, and storing both behind a 5-digit code the headset uses to load the deck.",
      "An AI model writes an audience question and a speaking script for each slide, then scores your spoken answer against a reference and hands back a report of the points you missed.",
    ],
    links: [],
    award: "1st Place — ACM Code2Create '25, 2,100+ participants",
  },
  {
    slug: "hatch",
    title: "Hatch",
    subtitle: "Short links, with an iOS app and a Go service behind them",
    year: 2025,
    when: "September 2025",
    platform: "iOS · Go service",
    role: "iOS & Backend Developer",
    description:
      "A link shortener taken seriously end to end: a native iOS client, a Go backend with a " +
      "clean architecture, and the unglamorous safety work that makes a redirect endpoint " +
      "survive the public internet.",
    tech: [
      { surface: "iOS", items: ["Swift", "SwiftUI"] },
      { surface: "Backend", items: ["Go", "Gin"] },
      { surface: "Data & Ops", items: ["PostgreSQL", "Redis", "Docker"] },
    ],
    highlights: [
      "iOS app for creating and managing links: Google sign-in, a tabbed dashboard with favourites and swipe actions, per-link analytics, native sharing, and full light/dark theming.",
      "Go backend with a handler–service–repository split and a small REST surface for creating, listing, sharing and deleting links, plus click tracking and account-level stats.",
      "The parts that keep it quick and safe: tokens verified on every request, ownership checks so you only ever see your own links, rate limiting on creation, a cache on the redirect path, and a harmful-URL check that fails open rather than taking the service down with it.",
    ],
    links: [],
    award: "1st Place — iOS Fusion by ADG-VIT",
  },
  {
    slug: "nova",
    title: "NOVA",
    subtitle: "Navigational Overlay for Visual Augmentation",
    year: 2025,
    when: "April 2025",
    platform: "Meta Quest 3 · Mixed Reality",
    role: "Mixed Reality Developer",
    description:
      "Mixed-reality training for industrial machinery: look at a machine and its diagnostics, " +
      "walkthroughs and warnings appear anchored to the real equipment in front of you.",
    tech: [
      { surface: "XR", items: ["Unity", "MetaXR", "Shaders"] },
      { surface: "AI", items: ["Google Gemini", "wit.ai"] },
      { surface: "Art", items: ["Blender"] },
    ],
    highlights: [
      "Spatially anchored 3D overlays on Quest 3, tied to lightweight 2D visual markers on the machines themselves.",
      "Natural-language AI support and a context-aware UI, so a diagnostic is a question you ask rather than a menu you navigate.",
      "Deliberately works without LiDAR or any external sensors — the marker approach exists precisely so it runs on hardware a factory already has.",
    ],
    links: [],
    award: "3rd Place — Women Techies '25 (Google Developer Groups) · since published as a patent",
  },
  {
    slug: "inferno",
    title: "INFERNO",
    subtitle: "Immersive Navigation for Fire Emergency Response & Neutralisation Operations",
    year: 2025,
    when: "February 2025",
    platform: "VR · Unity",
    role: "VR Developer",
    description:
      "Fire-safety training in VR, set inside a building the trainees actually know — VIT's " +
      "Technology Tower, rebuilt to its real layout with the extinguishers where they really are.",
    tech: [
      { surface: "VR", items: ["Unity", "XR Interaction Toolkit"] },
      { surface: "Art", items: ["Blender"] },
      { surface: "Systems", items: ["Particle System", "Automated email reports"] },
    ],
    highlights: [
      "Recreated the Technology Tower academic block to its original floor plan, with extinguishers placed where the real ones hang — so the training transfers to the actual building.",
      "XR Interaction Toolkit for picking up and aiming an extinguisher, with the Particle System simulating the CO₂ discharge.",
      "An evaluation pass tracks response times and emails an automated, percentile-based report afterwards.",
    ],
    links: [],
    award: "Best UI/UX — VIT Central Hackathon '25, 600+ participants",
  },
  {
    slug: "xposure",
    title: "Xposure",
    subtitle: "VR exposure therapy for the fear of speaking",
    year: 2025,
    when: "February 2025",
    platform: "VR · Unity",
    role: "VR Developer",
    description:
      "A tool for therapists: put a patient in front of an auditorium, an interview panel or a " +
      "stadium, and turn the pressure up or down a notch at a time.",
    tech: [
      { surface: "VR", items: ["Unity", "XR Interaction Toolkit"] },
    ],
    highlights: [
      "Three environments — auditorium, interview room, stadium — so a session can start wherever the patient can cope and escalate from there.",
      "Adaptive controls let the therapist dial audience size, noise level and speech content to personalise the exposure.",
      "Built, start to finish, in under 40 hours.",
    ],
    links: [],
    award: "1st Place — Developer's Code of Sprint (DevSoC) '25, 1,500+ participants",
  },
  {
    slug: "edventures",
    title: "Edventures",
    subtitle: "Textbook activities, lifted off the page",
    year: 2025,
    when: "January 2025",
    platform: "Android · AR",
    role: "AR Developer",
    description:
      "A gamified AR learning app that turns the experiments printed in a school textbook into " +
      "something a student can run on the desk in front of them.",
    tech: [{ surface: "AR", items: ["Unity", "AR Foundation"] }],
    highlights: [
      "Brings textbook activities to life to raise engagement in STEM subjects.",
      "Judged on the interface and the realism of the AR experiment simulations.",
    ],
    links: [],
    award: "Best User Experience — Institution's Innovation Council HackWars",
  },
];
