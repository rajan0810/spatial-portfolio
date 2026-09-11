"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useExperience, type GuardianPolygon } from "@/lib/store/experience";
import { damp, rail } from "@/lib/store/rail";
import { STATIONS } from "@/lib/stations";

/** Floor height, shared with the Backdrop grid. */
export const FLOOR_Y = -1.6;
const WALL_HEIGHT = 2.6;

/** Used when setup is skipped: a rounded play space around the viewer. */
export const DEFAULT_GUARDIAN: GuardianPolygon = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  // Superellipse: a squircle, like a room with soft corners.
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [Math.sign(c) * Math.pow(Math.abs(c), 0.6) * 3.4, Math.sign(s) * Math.pow(Math.abs(s), 0.6) * 2.9];
});

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uStrength;
  uniform vec3 uColor;
  uniform float uTime;

  void main() {
    if (uStrength < 0.001) discard;

    // u is metres along the wall, v is height: a real 25cm grid.
    vec2 coord = vec2(vUv.x, vUv.y * ${WALL_HEIGHT.toFixed(1)}) * 4.0;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Bright at the floor, gone before the top: the real guardian has no rim.
    float vertical = 1.0 - smoothstep(0.15, 1.0, vUv.y);
    float pulse = 0.8 + 0.2 * sin(uTime * 2.0 - vUv.y * 5.0);

    float alpha = line * vertical * uStrength * pulse * 0.7;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * The guardian boundary — as walls along the polygon you drew.
 *
 * Viewer-local: the polygon travels with the camera along the rail, so your
 * play space is wherever you currently are. It shows while you are crossing
 * between stations, exactly as a real boundary appears when you approach the
 * edge, and is held fully visible during setup so you can see what you drew.
 */
export function Guardian() {
  const saved = useExperience((s) => s.guardian);
  const phase = useExperience((s) => s.phase);
  const mesh = useRef<THREE.Mesh>(null);

  const polygon = saved && saved.length >= 3 ? saved : DEFAULT_GUARDIAN;

  const geometry = useMemo(() => buildWalls(polygon), [polygon]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uStrength: { value: 0 },
      uColor: { value: new THREE.Color("#3b82f6") },
      uTime: { value: 0 },
    }),
    [],
  );

  // Own the material: see Panel.tsx for why a <shaderMaterial uniforms={}>
  // element cannot be trusted to keep this object.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;

    let target: number;
    if (phase === "guardian" || phase === "floor") {
      target = 1;
    } else if (phase === "live") {
      const t = rail.progress * (STATIONS.length - 1);
      const betweenness = 1 - Math.abs((t % 1) - 0.5) * 2;
      target = Math.max(0, betweenness - 0.35) / 0.65;
    } else {
      target = 0;
    }
    uniforms.uStrength.value = damp(uniforms.uStrength.value, target, 6, Math.min(delta, 1 / 20));

    if (mesh.current) mesh.current.position.set(0, 0, camera.position.z);
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** One quad per polygon edge, with u in metres along the perimeter. */
function buildWalls(polygon: GuardianPolygon) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let run = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const [ax, az] = polygon[i];
    const [bx, bz] = polygon[(i + 1) % polygon.length];
    const len = Math.hypot(bx - ax, bz - az);
    const base = positions.length / 3;

    positions.push(ax, FLOOR_Y, az, bx, FLOOR_Y, bz, bx, FLOOR_Y + WALL_HEIGHT, bz, ax, FLOOR_Y + WALL_HEIGHT, az);
    uvs.push(run, 0, run + len, 0, run + len, 1, run, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    run += len;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
