"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useEditor } from "@/lib/store/editor";
import { useExperience } from "@/lib/store/experience";
import { rail } from "@/lib/store/rail";
import { STATIONS, stationWeight } from "@/lib/stations";

import { Panel } from "../panels/Panel";
import { StationGroup, stationFade } from "./StationGroup";

const SEGMENTS = 16;

/**
 * The tracking-calibration ring from a headset boot.
 *
 * Thin segments sweeping around the viewer while the DOM boot overlay runs its
 * sequence on top. It keeps spinning slowly after boot so the first station
 * still has life in it once the overlay clears.
 */
export function BootStation({ index }: { index: number }) {
  const ring = useRef<THREE.Group>(null);
  const z = STATIONS[index].z;
  const phase = useExperience((s) => s.phase);
  // The ring belongs to the headset, not the desk it is sitting on.
  const editing = useEditor((s) => s.mode === "edit");
  const worn = editing || (phase !== "desk" && phase !== "donning");

  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.visible = worn;
    const weight = stationWeight(rail.progress, index, 0.8);
    // Spins fast during boot, settling to a drift as you scroll away.
    ring.current.rotation.z = clock.elapsedTime * (0.35 + weight * 0.9);
  });

  return (
    <StationGroup index={index}>
      <group ref={ring} position={[0, 1.9, z]}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const angle = (i / SEGMENTS) * Math.PI * 2;
          const radius = 2.6;
          return (
            <Panel
              key={i}
              width={0.08}
              height={0.42 + (i % 3) * 0.12}
              curve={0}
              radius={0.03}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0,
              ]}
              rotation={[0, 0, angle + Math.PI / 2]}
              opacity={0}
              onFrame={stationFade(index, 0.9)}
            />
          );
        })}
      </group>
    </StationGroup>
  );
}
