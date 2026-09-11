"use client";

import { Canvas, events } from "@react-three/fiber";
import type * as THREE from "three";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { STATIONS } from "@/lib/stations";

import { PerfProbe } from "./PerfProbe";
import { Rig } from "./Rig";
import { DeskScene } from "./desk/DeskScene";
import { Backdrop } from "./effects/Backdrop";
import { Guardian } from "./effects/Guardian";
import { LensPass } from "./effects/LensPass";
import { Motes } from "./effects/Motes";
import { HandCursor } from "./input/HandCursor";
import { FloorConfirm } from "./setup/FloorConfirm";
import { GuardianDraw } from "./setup/GuardianDraw";
import { BootStation } from "./stations/BootStation";
import { HomeStation } from "./stations/HomeStation";
import { OutroStation } from "./stations/OutroStation";
import { ProjectStation } from "./stations/ProjectStation";

const indexOf = (id: string) => STATIONS.findIndex((station) => station.id === id);

/**
 * three's raycaster ignores `visible`, so a hidden object with an onClick can
 * still swallow every click that passes through it — the desk, once the
 * headset is on, sat exactly between the camera and the floor. Filter hits
 * down to objects that are visible through their whole ancestry.
 */
const isShown = (object: THREE.Object3D | null) => {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
};

const visibleEvents: NonNullable<React.ComponentProps<typeof Canvas>["events"]> = (store) => ({
  ...events(store),
  filter: (hits) => hits.filter((hit) => isShown(hit.object)),
});

/**
 * The WebGL layer. Fixed behind the DOM overlay, which carries all prose.
 *
 * Frame-budget choices worth keeping:
 *  - dpr is capped at 1.75. A 3x retina buffer triples fragment cost for a
 *    difference nobody sees on glass panels and video.
 *  - antialias is off: the panel shader antialiases its own silhouette with
 *    derivatives, so MSAA would be paying twice for the same edges.
 *  - the only light in the site is the desk lamp; the environment is all
 *    emissive glass.
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
    // negative-z-index child paints beneath its parent's background, which
    // hides the canvas completely.
    <div className="fixed inset-0 z-0">
      <Canvas
        events={visibleEvents}
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        camera={{ fov: 55, near: 0.1, far: 220, position: [0, 0.15, 11] }}
      >
        <Backdrop />
        <Motes />
        <Guardian />
        <HandCursor />
        <Rig />
        <PerfProbe />
        <LensPass />

        <DeskScene />
        <GuardianDraw />
        <FloorConfirm />

        <BootStation index={indexOf("boot")} />
        <HomeStation index={indexOf("home")} profile={profile} />
        {featured ? <ProjectStation index={indexOf("justix")} project={featured} /> : null}
        <OutroStation index={indexOf("outro")} />
      </Canvas>
    </div>
  );
}
