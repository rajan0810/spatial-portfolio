"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";
import { clamp01, damp, rail } from "@/lib/store/rail";
import { RAIL_LENGTH, STATIONS, nearestStation } from "@/lib/stations";

/** How far back from the current station the camera sits. */
const VIEW_DISTANCE = 6.5;
/** Eye height above the floor grid. */
const EYE_HEIGHT = 0.15;
/** How far the head can drift with the pointer, in world units. */
const PARALLAX_X = 0.55;
const PARALLAX_Y = 0.28;

/**
 * Drives the camera along the rail and applies the parallax "head tracking".
 *
 * Everything here reads from the `rail` singleton and mutates the camera
 * directly — no React state touches this loop. The only store write is the
 * active-station index, and that setter bails out when the value is unchanged.
 */
export function Rig() {
  const setActiveStation = useExperience((s) => s.setActiveStation);
  const comfort = useExperience((s) => s.comfort);

  const lookAt = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    // Clamp delta: after a background tab or a long GC pause, a huge delta
    // makes exponential damping overshoot visibly.
    const dt = Math.min(delta, 1 / 20);

    // Snap transitions quantise to the nearest station instead of gliding.
    const target = comfort.snapTransitions
      ? nearestStation(rail.target) / (STATIONS.length - 1)
      : rail.target;

    const lambda = comfort.reduceMotion ? 18 : comfort.snapTransitions ? 9 : 5;
    rail.progress = damp(rail.progress, clamp01(target), lambda, dt);

    const railZ = -rail.progress * RAIL_LENGTH;

    // Parallax: the scene should respond to where you are looking, the way it
    // would if the camera were your head. Disabled under reduced motion.
    const parallax = comfort.reduceMotion ? 0 : 1;
    const px = rail.pointerX * PARALLAX_X * parallax;
    const py = -rail.pointerY * PARALLAX_Y * parallax;

    camera.position.x = damp(camera.position.x, px, 4, dt);
    camera.position.y = damp(camera.position.y, EYE_HEIGHT + py, 4, dt);
    camera.position.z = railZ + VIEW_DISTANCE;

    // Look slightly *past* the current station, and counter-rotate against the
    // pointer so the parallax reads as head movement rather than the whole
    // world sliding.
    lookAt.current.set(px * 0.35, py * 0.5, railZ - 4);
    camera.lookAt(lookAt.current);

    setActiveStation(nearestStation(rail.progress));
  });

  return null;
}
