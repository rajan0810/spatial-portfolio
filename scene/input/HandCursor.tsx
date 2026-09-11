"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { sfx } from "@/lib/audio";
import { isLive, useExperience } from "@/lib/store/experience";
import { hand } from "@/lib/store/hand";
import { damp, rail } from "@/lib/store/rail";

/** How far in front of the camera the hand floats. */
const DEPTH = 2.6;

/**
 * Your hand.
 *
 * On a Quest with hand tracking, the cursor is your hand: it points, and a
 * pinch is a click. This is that, following the pointer at a fixed depth in
 * front of the camera. Open at rest; index extended over anything interactive
 * (with the ray appearing, as it does on the headset); thumb and index meet
 * on press.
 *
 * Built from a flattened sphere and five capsules — no model to load — and
 * rendered as pale glass so it reads as a tracked hand, not a cartoon glove.
 */
export function HandCursor() {
  const { camera } = useThree();
  const live = useExperience((s) => isLive(s.phase));
  const coarse = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    [],
  );

  const group = useRef<THREE.Group>(null);
  const index = useRef<THREE.Group>(null);
  const thumb = useRef<THREE.Group>(null);
  const others = useRef<(THREE.Group | null)[]>([]);
  const ray = useRef<THREE.Mesh>(null);

  const pinch = useRef(0);
  const point = useRef(0);
  const shown = useRef(0);
  const wasPressed = useRef(false);

  const ndc = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  // Pointer button state, read every frame by the render loop.
  useEffect(() => {
    const down = () => {
      hand.pressed = true;
    };
    const up = () => {
      hand.pressed = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 1 / 20);

    const visible = live && !coarse;
    shown.current = damp(shown.current, visible ? 1 : 0, 6, dt);
    group.current.visible = shown.current > 0.01;
    if (!group.current.visible) return;

    // Where the pointer is, DEPTH metres into the scene.
    ndc.set(rail.pointerX, -rail.pointerY, 0.5);
    ndc.unproject(camera);
    dir.copy(ndc).sub(camera.position).normalize();
    target.copy(camera.position).addScaledVector(dir, DEPTH);
    group.current.position.lerp(target, 1 - Math.exp(-22 * dt));

    // Face the way the camera faces, turned a little toward the pointer.
    group.current.quaternion.copy(camera.quaternion);
    group.current.rotateY(-rail.pointerX * 0.35);
    group.current.rotateX(rail.pointerY * 0.25);
    group.current.scale.setScalar(shown.current * 0.82);

    const pressed = hand.pressed || hand.grabbing;
    if (pressed !== wasPressed.current) {
      wasPressed.current = pressed;
      if (pressed) sfx.pinch(rail.pointerX * 0.6);
      else sfx.release(rail.pointerX * 0.6);
    }

    pinch.current = damp(pinch.current, pressed ? 1 : 0, 18, dt);
    point.current = damp(point.current, hand.hovering > 0 ? 1 : 0, 12, dt);

    // Index extends when pointing; curls slightly on pinch. Thumb sweeps in to
    // meet it. The other three fingers curl when pointing or pinching.
    if (index.current) {
      index.current.rotation.x = -0.15 + pinch.current * 0.55;
      index.current.rotation.z = 0.05 - point.current * 0.12;
    }
    if (thumb.current) {
      thumb.current.rotation.z = -0.9 + pinch.current * 0.75;
      thumb.current.rotation.y = 0.2 + pinch.current * 0.35;
    }
    const curl = Math.max(point.current, pinch.current);
    others.current.forEach((finger, i) => {
      if (!finger) return;
      finger.rotation.x = -0.1 + curl * (1.25 + i * 0.1);
    });

    // The ray shows while pointing or pinching, from the index tip forward.
    if (ray.current) {
      const strength = Math.max(point.current, pinch.current);
      ray.current.visible = strength > 0.02;
      ray.current.scale.set(1, strength, 1);
      (ray.current.material as THREE.MeshBasicMaterial).opacity = strength * 0.35;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* Palm. */}
      <mesh scale={[0.075, 0.095, 0.03]}>
        <sphereGeometry args={[1, 20, 14]} />
        <HandMaterial />
      </mesh>

      {/* Index finger — the one that points. */}
      <group ref={index} position={[0.03, 0.085, 0]}>
        <Finger length={0.11} />
      </group>

      {/* Middle, ring, little. */}
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(el) => void (others.current[i] = el)}
          position={[0.005 - i * 0.028, 0.088 - i * 0.006, 0]}
        >
          <Finger length={0.11 - i * 0.015} />
        </group>
      ))}

      {/* Thumb. */}
      <group ref={thumb} position={[0.075, 0.02, 0.01]} rotation={[0, 0.2, -0.9]}>
        <Finger length={0.085} radius={0.017} />
      </group>

      {/* Ray: a thin bar from the index tip, scaled by pointing strength. */}
      <mesh ref={ray} position={[0.03, 0.2, -3.2]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <cylinderGeometry args={[0.004, 0.0015, 6.4, 6, 1, true]} />
        <meshBasicMaterial color="#6aa6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Finger({ length, radius = 0.015 }: { length: number; radius?: number }) {
  return (
    <mesh position={[0, length / 2, 0]}>
      <capsuleGeometry args={[radius, length, 4, 10]} />
      <HandMaterial />
    </mesh>
  );
}

function HandMaterial() {
  return <meshBasicMaterial color="#eef3ff" transparent opacity={0.93} depthWrite={false} />;
}
