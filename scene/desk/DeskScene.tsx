"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";
import { damp } from "@/lib/store/rail";

/**
 * Act 0: a headset resting on a desk, under a lamp.
 *
 * Deliberately not in the glass UI language. Before you put the headset on,
 * you are in an ordinary room — the environment only begins once the lenses
 * meet your eyes. This is the single lit, shaded scene in the whole site,
 * which is why it is the only place a light exists.
 *
 * Picking it up: click, or the DOM button for keyboard users. The headset
 * rises to the camera, turns its lenses toward you and fills the frame while
 * the DOM fades to black; then the phase advances to `boot`.
 */

const DESK_Y = -1.35;
/** Where the headset rests. */
const REST = new THREE.Vector3(0, DESK_Y + 0.55, 5.4);
const REST_ROT = new THREE.Euler(0.12, -0.35, 0);
/** How long the donning animation takes, in seconds. */
const DON_SECONDS = 1.5;

export function DeskScene() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const reduceMotion = useExperience((s) => s.comfort.reduceMotion);

  const group = useRef<THREE.Group>(null);
  const headset = useRef<THREE.Group>(null);
  const hover = useRef(0);
  const hovering = useRef(false);
  const donProgress = useRef(0);
  const camTarget = useRef(new THREE.Vector3());
  const camQuat = useRef(new THREE.Quaternion());

  const visible = phase === "desk" || phase === "donning";

  // Reset the donning clock whenever we come back to the desk.
  useEffect(() => {
    if (phase === "desk") donProgress.current = 0;
  }, [phase]);

  useFrame(({ camera }, delta) => {
    if (!group.current || !headset.current) return;
    group.current.visible = visible;
    if (!visible) return;

    const dt = Math.min(delta, 1 / 20);

    hover.current = damp(hover.current, hovering.current ? 1 : 0, 10, dt);

    if (phase === "desk") {
      // Idle: a slow breathing hover so it reads as pick-up-able, plus a lift
      // on hover. The rest pose is otherwise fixed.
      const t = performance.now() / 1000;
      headset.current.position.set(
        REST.x,
        REST.y + Math.sin(t * 1.2) * 0.015 + hover.current * 0.12,
        REST.z,
      );
      headset.current.rotation.set(REST_ROT.x, REST_ROT.y + Math.sin(t * 0.6) * 0.03, REST_ROT.z);
      headset.current.scale.setScalar(1);
      return;
    }

    // Donning. Ease the headset from the desk into the camera, rotating so the
    // lenses face the viewer, and scale up as it approaches so the visor fills
    // the frame in the final frames.
    const speed = reduceMotion ? 3.5 : 1 / DON_SECONDS;
    donProgress.current = Math.min(1, donProgress.current + dt * speed);
    const p = donProgress.current;
    const eased = 1 - Math.pow(1 - p, 3);

    // Target: just in front of the camera, lenses toward it.
    camera.getWorldDirection(camTarget.current);
    camTarget.current.multiplyScalar(0.9).add(camera.position);
    camQuat.current.copy(camera.quaternion);
    // Lenses are on the -Z face of the model; turning it 180° about Y points
    // them at the camera.
    camQuat.current.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));

    headset.current.position.lerpVectors(REST, camTarget.current, eased);
    const restQuat = new THREE.Quaternion().setFromEuler(REST_ROT);
    headset.current.quaternion.slerpQuaternions(restQuat, camQuat.current, eased);
    headset.current.scale.setScalar(1 + eased * 0.35);

    if (p >= 1) setPhase("boot");
  });

  const pickUp = () => {
    if (phase === "desk") setPhase("donning");
  };

  // Gone entirely once it is on your face — the lamp with it.
  if (!visible) return null;

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* The lamp: one warm point light. The only light in the site. */}
      <pointLight
        position={[2.2, 1.9, 6.2]}
        intensity={26}
        distance={12}
        decay={2}
        color="#ffd9a8"
      />
      <ambientLight intensity={0.3} color="#8fb0ff" />

      {/* Lamp glow — an emissive disc so the light source reads as a thing. */}
      <mesh position={[2.2, 1.9, 6.2]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffe6c4" />
      </mesh>

      {/* Desk surface. */}
      <mesh position={[0, DESK_Y, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#1a1613" roughness={0.9} metalness={0} />
      </mesh>

      <Headset
        ref={headset}
        onHover={(on) => {
          hovering.current = on;
          document.body.style.cursor = on && phase === "desk" ? "grab" : "";
        }}
        onPick={pickUp}
        glow={hover}
      />

      <Controller position={[-1.35, DESK_Y + 0.13, 5.9]} rotation={[0.2, 0.5, 1.45]} />
      <Controller position={[1.25, DESK_Y + 0.13, 6.0]} rotation={[0.2, -0.6, -1.45]} />
    </group>
  );
}

/**
 * A stylised headset from primitives: light visor, dark facial interface,
 * strap ring, two lenses on the back face. No downloaded model, no licensing.
 */
function Headset({
  ref,
  onHover,
  onPick,
  glow,
}: {
  ref: React.Ref<THREE.Group>;
  onHover: (on: boolean) => void;
  onPick: () => void;
  glow: React.RefObject<number>;
}) {
  const halo = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (halo.current) halo.current.opacity = 0.08 + glow.current * 0.22;
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      {/* Visor. */}
      <RoundedBox args={[1.5, 0.78, 0.7]} radius={0.16} smoothness={6} position={[0, 0, 0.1]}>
        <meshStandardMaterial color="#e6e3dc" roughness={0.55} metalness={0.05} />
      </RoundedBox>

      {/* Front face — slightly darker so the visor has a "front". */}
      <RoundedBox args={[1.28, 0.6, 0.06]} radius={0.1} smoothness={4} position={[0, 0.02, 0.47]}>
        <meshStandardMaterial color="#cfcbc3" roughness={0.5} />
      </RoundedBox>

      {/* Facial interface (dark foam) at the back. */}
      <RoundedBox args={[1.42, 0.7, 0.32]} radius={0.14} smoothness={4} position={[0, -0.02, -0.3]}>
        <meshStandardMaterial color="#141416" roughness={1} />
      </RoundedBox>

      {/* Lenses on the back face — what you look through. */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0, -0.47]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.17, 32]} />
          <meshStandardMaterial color="#0a0d14" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}

      {/* Strap: a half-ring behind the visor. */}
      <mesh position={[0, 0.02, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.52, 0.045, 10, 40, Math.PI]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.9} />
      </mesh>

      {/* Hover halo: a soft additive shell that brightens when pick-up-able. */}
      <mesh position={[0, 0, 0]} scale={[1.9, 1.3, 1.6]}>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshBasicMaterial
          ref={halo}
          color="#6aa6ff"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function Controller({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <torusGeometry args={[0.22, 0.03, 10, 36]} />
        <meshStandardMaterial color="#e6e3dc" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.22, 0.05]} rotation={[0.35, 0, 0]}>
        <capsuleGeometry args={[0.055, 0.32, 6, 12]} />
        <meshStandardMaterial color="#1c1c20" roughness={0.9} />
      </mesh>
    </group>
  );
}

