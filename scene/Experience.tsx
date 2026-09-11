"use client";

import { Canvas } from "@react-three/fiber";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { STATIONS } from "@/lib/stations";

import { PerfProbe } from "./PerfProbe";
import { Rig } from "./Rig";
import { Backdrop } from "./effects/Backdrop";
import { GuardianGrid } from "./effects/GuardianGrid";
import { BootStation } from "./stations/BootStation";
import { HomeStation } from "./stations/HomeStation";
import { OutroStation } from "./stations/OutroStation";
import { ProjectStation } from "./stations/ProjectStation";

const indexOf = (id: string) => STATIONS.findIndex((station) => station.id === id);

/**
 * The WebGL layer. Fixed behind the DOM overlay, which carries all prose.
 *
 * Frame-budget choices worth keeping:
 *  - dpr is capped at 1.75. A 3x retina buffer triples fragment cost for a
 *    difference nobody sees on glass panels and video.
 *  - antialias is off: the panel shader antialiases its own silhouette with
 *    derivatives, so MSAA would be paying twice for the same edges.
 *  - no lights and no shadow maps anywhere. Every surface is emissive glass.
 */
export function Experience({
  profile,
  projects,
}: {
  profile: ProfileView;
  projects: ProjectView[];
}) {
  const featured = projects[0];

  return (
    // z-0, NOT a negative z-index: body carries an opaque background, and a
    // negative-z-index child paints beneath its parent's background, which hides
    // the canvas completely.
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.75]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
        }}
        camera={{ fov: 55, near: 0.1, far: 220, position: [0, 0.15, 11] }}
      >
        <Backdrop />
        <GuardianGrid />
        <Rig />
        <PerfProbe />

        <BootStation index={indexOf("boot")} />
        <HomeStation index={indexOf("home")} profile={profile} />
        {featured ? (
          <ProjectStation index={indexOf("justix")} project={featured} />
        ) : null}
        <OutroStation index={indexOf("outro")} />
      </Canvas>
    </div>
  );
}
