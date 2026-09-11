"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";

import { FLOOR_Y } from "../effects/Guardian";

/**
 * "Confirm floor level." Touch the floor.
 *
 * A pointer-catching floor plane that advances to `live` on click. The DOM
 * Confirm button in SetupOverlay does the same for keyboard users.
 */
export function FloorConfirm() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const plane = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    if (plane.current) plane.current.position.z = camera.position.z;
  });

  if (phase !== "floor") return null;

  return (
    <mesh
      ref={plane}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "";
        setPhase("live");
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
