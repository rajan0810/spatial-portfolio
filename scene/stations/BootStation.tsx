"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

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

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const weight = stationWeight(rail.progress, index, 1.1);
    // Spins fast during boot, settling to a drift as you scroll away.
    ring.current.rotation.z = clock.elapsedTime * (0.35 + weight * 0.9);
  });

  return (
    <StationGroup index={index}>
      <group ref={ring} position={[0, 0.1, z - 1.2]}>
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
