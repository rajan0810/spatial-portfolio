"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { damp, rail } from "@/lib/store/rail";
import { STATIONS } from "@/lib/stations";

/**
 * The guardian boundary.
 *
 * On a Quest, the blue grid appears as you approach the edge of your play
 * space. Here it appears as you travel *between* stations — peaking at the
 * midpoint of each transition and vanishing once you settle. Same grammar,
 * mapped onto the rail: it reads as "you are crossing a boundary".
 *
 * An in-joke that costs one cylinder and one shader, and lands instantly for
 * anyone who has worn the headset.
 */

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

    // Grid in cylinder UV space: u wraps around, v runs floor → ceiling.
    vec2 coord = vec2(vUv.x * 48.0, vUv.y * 12.0);
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Fade out toward the top so the cage has no visible rim.
    float vertical = 1.0 - smoothstep(0.45, 1.0, vUv.y);

    // Slow travelling shimmer, as on the real boundary.
    float pulse = 0.75 + 0.25 * sin(uTime * 2.0 + vUv.y * 6.0);

    float alpha = line * vertical * uStrength * pulse * 0.55;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function GuardianGrid() {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uStrength: { value: 0 },
      uColor: { value: new THREE.Color("#3b82f6") },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame(({ camera, clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;

    // 0 at a station, 1 exactly between two stations.
    const t = rail.progress * (STATIONS.length - 1);
    const betweenness = 1 - Math.abs((t % 1) - 0.5) * 2;
    // Only the upper part of that curve shows, so the grid stays an event
    // rather than a permanent fixture.
    const target = Math.max(0, betweenness - 0.35) / 0.65;

    uniforms.uStrength.value = damp(
      uniforms.uStrength.value,
      target,
      6,
      delta,
    );

    // The cage travels with the viewer.
    if (mesh.current) mesh.current.position.z = camera.position.z;
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0]}>
      <cylinderGeometry args={[7.5, 7.5, 9, 64, 1, true]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
