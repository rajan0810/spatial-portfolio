"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { sfx } from "@/lib/audio";
import { useExperience } from "@/lib/store/experience";
import { hand } from "@/lib/store/hand";
import { damp, rail } from "@/lib/store/rail";

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
  /**
   * Can be picked up and thrown. Drag moves it in its own plane; release
   * gives it your velocity; a spring brings it home with a little overshoot.
   * The Quest panel-grab, which is the most satisfying thing on the platform.
   */
  grabbable?: boolean;
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

/** Spring constants for the return-home motion. Tuned for a satisfying thunk. */
const SPRING_K = 26;
const SPRING_DAMPING = 5.5;
const THROW_ACHIEVEMENT_SPEED = 4;

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
  grabbable = false,
  opacity = 1,
  onFrame,
  onClick,
}: PanelProps) {
  const { camera } = useThree();
  const interactive = hoverable || grabbable || Boolean(onClick);

  const geometry = useMemo(() => createCurvedPlane(width, height, curve), [width, height, curve]);
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
    // Built once; everything mutable is updated by reference below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * The material is constructed here rather than declared as <shaderMaterial>,
   * so this component owns the instance and its uniforms object. Passing a
   * `uniforms` prop to <shaderMaterial> does not guarantee the rendered
   * material keeps that object; mutate an orphan and nothing ever changes.
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

  // --- grab physics, all outside React -------------------------------------
  const mesh = useRef<THREE.Mesh>(null);
  const hoverTarget = useRef(0);
  const hovered = useRef(false);
  const grabbed = useRef(false);

  // If this panel disappears while hovered (station culled, phase change), the
  // hand must not be left pointing at nothing.
  useEffect(
    () => () => {
      if (hovered.current) hand.hovering = Math.max(0, hand.hovering - 1);
      if (grabbed.current) hand.grabbing = false;
    },
    [],
  );
  const offset = useMemo(() => new THREE.Vector3(), []);
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const grabTarget = useMemo(() => new THREE.Vector3(), []);
  const grabStart = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lastPointerWorld = useMemo(() => new THREE.Vector3(), []);
  const tilt = useMemo(() => new THREE.Vector2(), []);
  const home = useMemo(() => new THREE.Vector3(...position), [position]);

  /** Where the pointer ray meets the panel's drag plane, in the parent's space. */
  const pointerOnPlane = (out: THREE.Vector3) => {
    if (!mesh.current) return false;
    ndc.set(rail.pointerX, -rail.pointerY);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return false;
    out.copy(hit);
    mesh.current.parent?.worldToLocal(out);
    return true;
  };

  const beginGrab = (event: ThreeEvent<PointerEvent>) => {
    if (!mesh.current) return;
    event.stopPropagation();
    // Drag plane: through the panel, facing the camera.
    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal);
    const world = new THREE.Vector3();
    mesh.current.getWorldPosition(world);
    plane.setFromNormalAndCoplanarPoint(normal, world);

    if (!pointerOnPlane(grabStart)) return;
    grabStart.sub(offset);
    lastPointerWorld.copy(grabStart);
    grabbed.current = true;
    hand.grabbing = true;
    velocity.set(0, 0, 0);
    useExperience.getState().announce("grab");
  };

  useEffect(() => {
    if (!grabbable) return;
    const release = () => {
      if (!grabbed.current) return;
      grabbed.current = false;
      hand.grabbing = false;
      const speed = velocity.length();
      if (speed > 0.6) sfx.whoosh(speed);
      if (speed > THROW_ACHIEVEMENT_SPEED) useExperience.getState().announce("throw");
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [grabbable, velocity]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uHover.value = damp(uniforms.uHover.value, hoverTarget.current + (grabbed.current ? 0.6 : 0), 10, dt);
    onFrame?.(uniforms, state.clock.elapsedTime, dt);

    if (!grabbable || !mesh.current) return;

    if (grabbed.current && pointerOnPlane(grabTarget)) {
      // Follow the pointer, and remember how fast it is moving for the throw.
      grabTarget.sub(grabStart);
      velocity.copy(grabTarget).sub(offset).divideScalar(Math.max(dt, 1e-3)).multiplyScalar(0.6).add(velocity.clone().multiplyScalar(0.4));
      offset.lerp(grabTarget, 1 - Math.exp(-30 * dt));
    } else {
      // Spring home. Semi-implicit Euler is stable at these constants.
      velocity.addScaledVector(offset, -SPRING_K * dt);
      velocity.multiplyScalar(Math.exp(-SPRING_DAMPING * dt));
      offset.addScaledVector(velocity, dt);
      if (offset.lengthSq() < 1e-6 && velocity.lengthSq() < 1e-5) {
        offset.set(0, 0, 0);
        velocity.set(0, 0, 0);
      }
    }

    mesh.current.position.copy(home).add(offset);

    // Lean into the motion, like a panel with a little mass.
    tilt.set(-velocity.y * 0.05, velocity.x * 0.05);
    mesh.current.rotation.x = rotation[0] + THREE.MathUtils.clamp(tilt.x, -0.35, 0.35);
    mesh.current.rotation.y = rotation[1] + THREE.MathUtils.clamp(tilt.y, -0.35, 0.35);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      position={position}
      rotation={rotation}
      onPointerOver={
        interactive
          ? (event) => {
              event.stopPropagation();
              if (!hovered.current) {
                hovered.current = true;
                hand.hovering += 1;
              }
              hoverTarget.current = 1;
              sfx.tick(rail.pointerX * 0.6);
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              hoverTarget.current = 0;
              if (hovered.current) {
                hovered.current = false;
                hand.hovering = Math.max(0, hand.hovering - 1);
              }
            }
          : undefined
      }
      onPointerDown={grabbable ? beginGrab : undefined}
      onClick={onClick ? () => onClick() : undefined}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}
