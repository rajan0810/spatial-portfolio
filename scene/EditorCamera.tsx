"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { stationFor, useEditor } from "@/lib/store/editor";
import { rail } from "@/lib/store/rail";
import { STATIONS, stationProgress } from "@/lib/stations";

/** Where the editor camera sits relative to a framed station. */
const FRAME_OFFSET = new THREE.Vector3(5.5, 3.2, 9.5);
/** The whole-scene overview, used for the scene root. */
const OVERVIEW_TARGET = new THREE.Vector3(0, 1.2, -STATIONS[STATIONS.length - 1].z / 2 * -1);
const OVERVIEW_OFFSET = new THREE.Vector3(18, 9, 26);

/**
 * The scene-view camera: free orbit, pan and dolly, with framing.
 *
 * Selecting something in the hierarchy (or pressing F) flies the camera to
 * frame that station, the way an editor does. Between framings the controls
 * are yours. Also keeps the rail's progress pointed at the framed station, so
 * the mood, motes and label fades follow the selection instead of the scroll.
 */
export function EditorCamera() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const frameRequest = useEditor((s) => s.frameRequest);

  const goalTarget = useMemo(() => new THREE.Vector3(0, 1.5, -6), []);
  const goalPosition = useMemo(() => new THREE.Vector3(9, 4, 12), []);
  const flying = useRef(true);

  useEffect(() => {
    const station = stationFor(nodes, selectedId);
    if (station) {
      const index = STATIONS.findIndex((s) => s.id === station);
      goalTarget.set(0, 1.6, STATIONS[index].z);
      goalPosition.copy(goalTarget).add(FRAME_OFFSET);
    } else {
      goalTarget.copy(OVERVIEW_TARGET);
      goalPosition.copy(OVERVIEW_TARGET).add(OVERVIEW_OFFSET);
    }
    flying.current = true;
  }, [nodes, selectedId, frameRequest, goalTarget, goalPosition]);

  // Any user input on the controls cancels the flight.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => {
      flying.current = false;
    };
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const c = controls.current;

    // Keep the rail at the framed station so the environment follows the selection.
    const station = stationFor(nodes, selectedId);
    const index = station ? STATIONS.findIndex((s) => s.id === station) : 0;
    const want = stationProgress(index);
    rail.target = want;
    rail.progress += (want - rail.progress) * (1 - Math.exp(-4 * dt));

    if (!flying.current || !c) return;
    const k = 1 - Math.exp(-4.5 * dt);
    c.target.lerp(goalTarget, k);
    camera.position.lerp(goalPosition, k);
    c.update();
    if (camera.position.distanceTo(goalPosition) < 0.02) flying.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={80}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}
