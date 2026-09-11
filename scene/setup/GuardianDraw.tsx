"use client";

import { Line } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

import { useExperience, type GuardianPolygon } from "@/lib/store/experience";

import { FLOOR_Y } from "../effects/Guardian";

/** Minimum perimeter, in metres, before a drawing counts as a boundary. */
const MIN_PERIMETER = 4;
/** Drop points closer than this to the previous one; keeps the polygon sane. */
const MIN_STEP = 0.12;

/**
 * "Draw your Guardian."
 *
 * A pointer-catching floor plane. Press, trace, release: the trace closes into
 * the polygon the rest of the site uses as its boundary. Points are stored
 * viewer-local, so the shape travels with you along the rail.
 *
 * A trace that is too small is simply discarded and you draw again — the
 * same forgiving loop as the real setup.
 */
export function GuardianDraw() {
  const phase = useExperience((s) => s.phase);
  const setGuardian = useExperience((s) => s.setGuardian);
  const setPhase = useExperience((s) => s.setPhase);

  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const drawing = useRef(false);
  const plane = useRef<THREE.Mesh>(null);
  const cameraZ = useRef(0);

  useFrame(({ camera }) => {
    cameraZ.current = camera.position.z;
    if (plane.current) plane.current.position.z = camera.position.z;
  });

  if (phase !== "guardian") return null;

  const toLocal = (p: THREE.Vector3) =>
    new THREE.Vector3(p.x, FLOOR_Y + 0.02, p.z - cameraZ.current);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    setPoints([toLocal(e.point)]);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drawing.current) return;
    const next = toLocal(e.point);
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.distanceTo(next) < MIN_STEP) return prev;
      return [...prev, next];
    });
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;

    const polygon: GuardianPolygon = points.map((p) => [p.x, p.z]);
    const perimeter = polygon.reduce((sum, [x, z], i) => {
      const [nx, nz] = polygon[(i + 1) % polygon.length];
      return sum + Math.hypot(nx - x, nz - z);
    }, 0);

    if (polygon.length >= 3 && perimeter >= MIN_PERIMETER) {
      setGuardian(polygon);
      setPhase("floor");
    } else {
      setPoints([]);
    }
  };

  return (
    <>
      {/* Invisible, but it must render so the raycaster can hit it. */}
      <mesh
        ref={plane}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {points.length >= 2 ? (
        <group position={[0, 0, cameraZ.current]}>
          <Line
            points={points}
            color="#6aa6ff"
            lineWidth={3}
            transparent
            opacity={0.95}
          />
          {/* Close the loop visually while still drawing. */}
          {points.length >= 3 ? (
            <Line
              points={[points[points.length - 1], points[0]]}
              color="#6aa6ff"
              lineWidth={1.5}
              dashed
              dashSize={0.15}
              gapSize={0.12}
              transparent
              opacity={0.5}
            />
          ) : null}
        </group>
      ) : null}
    </>
  );
}
