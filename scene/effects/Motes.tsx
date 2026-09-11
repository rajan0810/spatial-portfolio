"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";
import { damp } from "@/lib/store/rail";

import { currentMood, makeMood } from "./mood";

const COUNT = 520;
/** The volume the motes live in, centred on the camera. */
const BOX = new THREE.Vector3(36, 14, 60);

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uVisible;
  varying float vAlpha;

  void main() {
    // Each mote drifts on its own slow orbit. Cheaper than simulating.
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed * 6.283) * 0.6;
    p.y += sin(uTime * 0.07 + aSeed * 12.0) * 0.4 + cos(uTime * 0.05 + aSeed) * 0.3;
    p.z += cos(uTime * 0.09 + aSeed * 3.0) * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;

    // Close motes are larger and brighter; far ones dissolve into the sky.
    // Capped: a mote right in front of the lens should be a soft speck, not
    // a blob the size of a panel.
    gl_PointSize = min((1.6 + aSeed * 2.4) * (90.0 / max(dist, 1.0)), 11.0);
    vAlpha = uVisible * (0.12 + aSeed * 0.2) * (1.0 - smoothstep(20.0, 45.0, dist)) * smoothstep(1.5, 6.0, dist);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    // Soft disc with a brighter core, like dust catching a lamp.
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Dust in the air.
 *
 * A few hundred additive points drifting slowly around the viewer, tinted by
 * the station mood. They cost almost nothing and do a job no panel can: they
 * make the space between things visible, which is what makes it feel like a
 * place rather than a black backdrop.
 */
export function Motes() {
  const phase = useExperience((s) => s.phase);
  const points = useRef<THREE.Points>(null);
  const mood = useMemo(makeMood, []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * BOX.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * BOX.y + 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
      seeds[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVisible: { value: 0 },
      uColor: { value: new THREE.Color("#6aa6ff") },
    }),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ camera, clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;
    const worn = phase === "desk" || phase === "donning" ? 0 : 1;
    uniforms.uVisible.value = damp(uniforms.uVisible.value, worn, 1.5, Math.min(delta, 1 / 20));
    currentMood(mood);
    uniforms.uColor.value.copy(mood.accent).lerp(new THREE.Color("#ffffff"), 0.35);
    // The cloud travels with the viewer; individual motes drift within it.
    if (points.current) points.current.position.z = camera.position.z - 8;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
