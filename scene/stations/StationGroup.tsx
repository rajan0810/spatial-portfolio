"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";

import { damp, rail } from "@/lib/store/rail";
import { STATIONS, stationWeight } from "@/lib/stations";

/**
 * Wraps one station's contents and culls them when the camera is elsewhere.
 *
 * The visibility toggle is the important part: an invisible group costs zero
 * draw calls, so the whole rail stays as cheap as the single station you are
 * actually looking at. Without this, every panel on the site would be submitted
 * every frame.
 */
export function StationGroup({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const shown = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;

    const weight = stationWeight(rail.progress, index, 0.9);
    shown.current = damp(shown.current, weight, 8, Math.min(delta, 1 / 20));

    const visible = shown.current > 0.004;
    if (group.current.visible !== visible) group.current.visible = visible;

    // Stations lean away as you leave them, which reads as depth rather than a
    // crossfade between slides.
    const offset = (rail.progress * (STATIONS.length - 1) - index) * 0.6;
    group.current.position.y = -offset * 0.25;
    group.current.rotation.x = offset * 0.05;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Per-panel opacity driver. Passed to `Panel.onFrame` so fading mutates a
 * uniform instead of re-rendering the component tree.
 */
export function stationFade(index: number, scale = 1) {
  return (
    uniforms: { uOpacity: { value: number } },
    _elapsed: number,
    delta: number,
  ) => {
    const weight = stationWeight(rail.progress, index, 0.9) * scale;
    uniforms.uOpacity.value = damp(
      uniforms.uOpacity.value,
      weight,
      8,
      Math.min(delta, 1 / 20),
    );
  };
}
