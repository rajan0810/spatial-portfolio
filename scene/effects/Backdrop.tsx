"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useEditor } from "@/lib/store/editor";
import { useExperience } from "@/lib/store/experience";
import { damp } from "@/lib/store/rail";
import { RAIL_LENGTH } from "@/lib/stations";

import { currentMood, makeMood } from "./mood";

/**
 * The environment: a gradient dome with a horizon glow, and a receding floor
 * grid. Both take their colour from the station mood, so travelling the rail
 * moves you through weather, not just past panels.
 *
 * The floor is doing most of the work. A grid with distance fade is the
 * cheapest possible way to establish real depth — two triangles and a shader.
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

  float gridLine(vec2 coord, float width) {
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    return 1.0 - min(line / width, 1.0);
  }

  void main() {
    vec2 coord = vWorld / uSpacing;
    float fine = gridLine(coord, 1.0) * 0.28;
    float coarse = gridLine(coord * 0.2, 1.2) * 0.4;

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
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uAccent;
  uniform float uTime;

  void main() {
    vec3 n = normalize(vPos);
    float h = n.y;
    vec3 color = mix(uLow, uHigh, smoothstep(-0.35, 0.85, h));

    // Horizon glow: a band just above the floor line, brightest straight ahead.
    float horizon = exp(-abs(h + 0.02) * 9.0);
    float ahead = 0.55 + 0.45 * smoothstep(-0.2, 1.0, -n.z);
    color += uAccent * horizon * ahead * 0.22;

    // Very slow drifting bands so the sky is never a static gradient.
    float band = sin(h * 14.0 + uTime * 0.05 + n.x * 2.0) * 0.5 + 0.5;
    color += uHigh * band * 0.05;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function Backdrop() {
  const phase = useExperience((s) => s.phase);
  const editing = useEditor((s) => s.mode === "edit");
  const floor = useRef<THREE.Mesh>(null);
  const mood = useMemo(makeMood, []);
  const dim = useMemo(() => new THREE.Color(), []);

  const floorUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#2e7cf6") },
      uCameraZ: { value: 0 },
      uSpacing: { value: 1.2 },
      uVisible: { value: 0 },
    }),
    [],
  );
  const domeUniforms = useMemo(
    () => ({
      uLow: { value: new THREE.Color("#05070c") },
      uHigh: { value: new THREE.Color("#0b1226") },
      uAccent: { value: new THREE.Color("#2e7cf6") },
      uTime: { value: 0 },
    }),
    [],
  );

  // Own the materials: see Panel.tsx for why <shaderMaterial uniforms={}>
  // cannot be trusted to keep this object.
  const floorMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        uniforms: floorUniforms,
        transparent: true,
        depthWrite: false,
      }),
    [floorUniforms],
  );
  const domeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: domeUniforms,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [domeUniforms],
  );
  useEffect(
    () => () => {
      floorMaterial.dispose();
      domeMaterial.dispose();
    },
    [floorMaterial, domeMaterial],
  );

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const k = 1 - Math.exp(-3 * dt);
    currentMood(mood);

    const worn = editing || !(phase === "desk" || phase === "donning") ? 1 : 0;

    floorUniforms.uCameraZ.value = camera.position.z;
    floorUniforms.uColor.value.copy(mood.accent);
    floorUniforms.uVisible.value = damp(floorUniforms.uVisible.value, worn, 2.5, dt);

    // On the desk the sky is a plain dark room; the weather arrives with the headset.
    domeUniforms.uTime.value = clock.elapsedTime;
    dim.copy(mood.low).multiplyScalar(0.6);
    domeUniforms.uLow.value.lerp(worn ? mood.low : dim, k);
    domeUniforms.uHigh.value.lerp(worn ? mood.high : mood.low, k);
    domeUniforms.uAccent.value.lerp(worn ? mood.accent : mood.low, k);

    if (floor.current) floor.current.position.z = camera.position.z;
  });

  return (
    <>
      <mesh position={[0, 0, -RAIL_LENGTH / 2]} renderOrder={-2}>
        <sphereGeometry args={[90, 32, 20]} />
        <primitive object={domeMaterial} attach="material" />
      </mesh>

      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} renderOrder={-1}>
        <planeGeometry args={[120, 120]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>
    </>
  );
}
