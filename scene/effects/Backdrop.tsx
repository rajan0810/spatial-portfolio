"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";
import { damp, rail } from "@/lib/store/rail";
import { RAIL_LENGTH } from "@/lib/stations";

/**
 * The environment: a receding floor grid and a gradient dome.
 *
 * The floor is doing most of the work. A grid with distance fade is the
 * cheapest possible way to establish real depth — two triangles and a shader,
 * no geometry, no lights — and it is what makes the camera travel legible as
 * movement through a space rather than things sliding around on a flat page.
 */

const floorVertex = /* glsl */ `
  varying vec2 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const floorFragment = /* glsl */ `
  precision highp float;

  varying vec2 vWorld;

  uniform vec3 uColor;
  uniform float uCameraZ;
  uniform float uSpacing;
  uniform float uVisible;

  // Antialiased grid line coverage, using derivatives so distant lines fade
  // instead of aliasing into moiré.
  float gridLine(vec2 coord, float width) {
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    return 1.0 - min(line / width, 1.0);
  }

  void main() {
    vec2 coord = vWorld / uSpacing;

    float fine = gridLine(coord, 1.0) * 0.30;
    float coarse = gridLine(coord * 0.2, 1.2) * 0.42;

    // Fade with distance from the camera along the rail, so the grid resolves
    // ahead of you and dissolves behind.
    float dist = length(vec2(vWorld.x, vWorld.y - uCameraZ));
    float fade = 1.0 - smoothstep(6.0, 42.0, dist);

    float strength = (fine + coarse) * fade * uVisible;

    if (strength < 0.002) discard;

    gl_FragColor = vec4(uColor, strength);
  }
`;

const domeVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  void main() {
    float h = normalize(vPos).y;
    vec3 low = vec3(0.020, 0.027, 0.047);
    vec3 high = vec3(0.043, 0.070, 0.133);
    gl_FragColor = vec4(mix(low, high, smoothstep(-0.4, 0.9, h)), 1.0);
  }
`;

export function Backdrop() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#2e7cf6") },
      uCameraZ: { value: 0 },
      uSpacing: { value: 1.2 },
      uVisible: { value: 0 },
    }),
    [],
  );

  const floor = useRef<THREE.Mesh>(null);
  const phase = useExperience((s) => s.phase);

  // Own the materials: see Panel.tsx for why <shaderMaterial uniforms={}>
  // cannot be trusted to keep this object.
  const floorMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
      }),
    [uniforms],
  );
  const domeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
      }),
    [],
  );
  useEffect(
    () => () => {
      floorMaterial.dispose();
      domeMaterial.dispose();
    },
    [floorMaterial, domeMaterial],
  );

  useFrame(({ camera }, delta) => {
    uniforms.uCameraZ.value = camera.position.z;
    // The grid is the environment; it exists only once the headset is on.
    const worn = phase === "desk" || phase === "donning" ? 0 : 1;
    uniforms.uVisible.value = damp(uniforms.uVisible.value, worn, 2.5, Math.min(delta, 1 / 20));
    // Keep the floor centred under the camera so a modest plane can stand in
    // for an infinite one.
    if (floor.current) floor.current.position.z = camera.position.z;
  });

  return (
    <>
      {/* Gradient dome. Rendered first, never depth-tested against. */}
      <mesh position={[0, 0, -RAIL_LENGTH / 2]} renderOrder={-2}>
        <sphereGeometry args={[90, 24, 16]} />
        <primitive object={domeMaterial} attach="material" />
      </mesh>

      <mesh
        ref={floor}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.6, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[120, 120]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>
    </>
  );
}
