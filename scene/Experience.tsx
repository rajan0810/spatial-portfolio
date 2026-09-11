"use client";

import { Canvas, events } from "@react-three/fiber";
import type * as THREE from "three";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { useEditor } from "@/lib/store/editor";
import { STATIONS } from "@/lib/stations";

import { EditorCamera } from "./EditorCamera";
import { PauseLoop } from "./PauseLoop";
import { PerfProbe } from "./PerfProbe";
import { Rig } from "./Rig";
import { Selection } from "./Selection";
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
 * still swallow every click that passes through it. Filter hits down to
 * objects that are visible through their whole ancestry.
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
 * The WebGL layer, filling whatever element it is placed in: the editor's
 * scene view, or the whole screen in Play.
 *
 * One scene, two ways of looking at it. In edit mode the editor camera orbits
 * it with the selection outlined; in the Game tab and in Play the rail camera
 * drives, with the lens, the hand and the guardian only in Play.
 *
 * Frame-budget choices worth keeping: dpr capped at 1.75; MSAA off (the panel
 * shader antialiases its own edges); the only light is the desk lamp.
 */
export function Experience({ profile, projects }: { profile: ProfileView; projects: ProjectView[] }) {
  const mode = useEditor((s) => s.mode);
  const viewTab = useEditor((s) => s.viewTab);
  const featured = projects[0];

  const playing = mode === "play";
  const sceneView = !playing && viewTab === "scene";

  return (
    // Absolute within its host, never a negative z-index: body carries an
    // opaque background, and a negative-z child paints beneath it.
    <div className="absolute inset-0 z-0">
      <Canvas
        events={visibleEvents}
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        camera={{ fov: 55, near: 0.1, far: 220, position: [9, 4, 12] }}
      >
        <Backdrop />
        <Motes />
        {/* LensPass is the render loop: any positive-priority useFrame turns off
            R3F's automatic render, and PerfProbe below has one. Always mounted. */}
        <LensPass />
        <PerfProbe />
        <PauseLoop />

        {sceneView ? (
          <>
            <EditorCamera />
            <Selection />
          </>
        ) : (
          <Rig />
        )}

        {playing ? (
          <>
            <Guardian />
            <HandCursor />
            <DeskScene />
            <GuardianDraw />
            <FloorConfirm />
          </>
        ) : null}

        <BootStation index={indexOf("boot")} />
        <HomeStation index={indexOf("home")} profile={profile} />
        {featured ? <ProjectStation index={indexOf("justix")} project={featured} /> : null}
        <OutroStation index={indexOf("outro")} />
      </Canvas>
    </div>
  );
}
