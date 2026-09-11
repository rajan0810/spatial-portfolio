"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { damp } from "@/lib/store/rail";

import { createCurvedPlane } from "./curvedPlane";
import { panelFragmentShader, panelVertexShader } from "./panelShader";

export type PanelUniforms = {
  uMap: { value: THREE.Texture | null };
  uHasMap: { value: number };
  uOpacity: { value: number };
  uHover: { value: number };
  uAspect: { value: number };
  uRadius: { value: number };
  uTime: { value: number };
  uAccent: { value: THREE.Color };
  uFill: { value: THREE.Color };
};

export type PanelProps = {
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Arc sweep in radians; 0 is flat. */
  curve?: number;
  /** Corner radius in the shader's half-height units. */
  radius?: number;
  map?: THREE.Texture | null;
  accent?: string;
  fill?: string;
  hoverable?: boolean;
  /** Starting opacity; drive changes through `onFrame` rather than re-rendering. */
  opacity?: number;
  /**
   * Called every frame with the material's uniforms. This is how stations fade
   * panels in and out — mutating a uniform costs nothing, whereas re-rendering
   * to change opacity 60x/second would not fit the frame budget.
   */
  onFrame?: (uniforms: PanelUniforms, elapsed: number, delta: number) => void;
  onClick?: () => void;
};

export function Panel({
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  curve = 0.45,
  radius = 0.08,
  map = null,
  accent = "#2e7cf6",
  // Panel glass, not background. Must sit clearly above the backdrop's
  // luminance or the panel reads as a hole punched in the scene.
  fill = "#1a2540",
  hoverable = false,
  opacity = 1,
  onFrame,
  onClick,
}: PanelProps) {
  const geometry = useMemo(
    () => createCurvedPlane(width, height, curve),
    [width, height, curve],
  );

  // Geometry is created per-panel, so it must be disposed with the component.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo<PanelUniforms>(
    () => ({
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uOpacity: { value: opacity },
      uHover: { value: 0 },
      uAspect: { value: width / height },
      uRadius: { value: radius },
      uTime: { value: 0 },
      uAccent: { value: new THREE.Color(accent) },
      uFill: { value: new THREE.Color(fill) },
    }),
    // Intentionally built once. Everything mutable is updated below, by
    // reference, so this never needs to be rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * The material is constructed here rather than declared as <shaderMaterial>,
   * so this component owns the instance and its uniforms object.
   *
   * This matters: passing a `uniforms` prop to <shaderMaterial> does not
   * guarantee the rendered material keeps that same object, and if it does not,
   * every per-frame mutation (opacity, hover, time) silently writes to an
   * orphaned object — panels stay stuck at their initial opacity of 0 and render
   * nothing at all, with no error anywhere.
   */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: panelVertexShader,
        fragmentShader: panelFragmentShader,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [uniforms],
  );

  useEffect(() => () => material.dispose(), [material]);

  // Keep the texture uniform in sync when a video finishes loading.
  useEffect(() => {
    uniforms.uMap.value = map;
    uniforms.uHasMap.value = map ? 1 : 0;
  }, [map, uniforms]);

  useEffect(() => {
    uniforms.uAspect.value = width / height;
    uniforms.uRadius.value = radius;
    uniforms.uAccent.value.set(accent);
    uniforms.uFill.value.set(fill);
  }, [width, height, radius, accent, fill, uniforms]);

  const hoverTarget = useRef(0);

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uHover.value = damp(
      uniforms.uHover.value,
      hoverTarget.current,
      10,
      delta,
    );
    onFrame?.(uniforms, state.clock.elapsedTime, delta);
  });

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      onPointerOver={
        hoverable
          ? (event) => {
              event.stopPropagation();
              hoverTarget.current = 1;
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        hoverable
          ? () => {
              hoverTarget.current = 0;
              document.body.style.cursor = "";
            }
          : undefined
      }
      onClick={onClick ? () => onClick() : undefined}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}
