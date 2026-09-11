"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { sfx } from "@/lib/audio";
import { useExperience } from "@/lib/store/experience";
import { hand } from "@/lib/store/hand";
import { damp } from "@/lib/store/rail";

/**
 * Act 0: a headset resting on a desk, under a lamp.
 *
 * Deliberately not in the glass UI language. Before you put the headset on,
 * you are in an ordinary room at night — a wooden desk, a mug, a notebook, a
 * window's glow — and the environment only begins once the lenses meet your
 * eyes. The only lit, shaded scene in the site; it unmounts once worn.
 *
 * Picking it up: click, or the DOM button for keyboard users. The headset
 * rises to the camera, turns its lenses toward you and fills the frame while
 * the DOM fades to black; then the phase advances to `boot`.
 */

const DESK_Y = -1.35;
const DESK_Z = 5;
const REST = new THREE.Vector3(0, DESK_Y + 0.55, 5.4);
const REST_ROT = new THREE.Euler(0.12, -0.35, 0);
const DON_SECONDS = 1.5;

export function DeskScene() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const reduceMotion = useExperience((s) => s.comfort.reduceMotion);

  const headset = useRef<THREE.Group>(null);
  const hover = useRef(0);
  const hovering = useRef(false);
  const donProgress = useRef(0);
  const camTarget = useRef(new THREE.Vector3());
  const camQuat = useRef(new THREE.Quaternion());
  const restQuat = useMemo(() => new THREE.Quaternion().setFromEuler(REST_ROT), []);
  const flip = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), []);

  const visible = phase === "desk" || phase === "donning";

  useEffect(() => {
    if (phase === "desk") donProgress.current = 0;
  }, [phase]);

  useFrame(({ camera }, delta) => {
    if (!headset.current || !visible) return;
    const dt = Math.min(delta, 1 / 20);
    hover.current = damp(hover.current, hovering.current ? 1 : 0, 10, dt);

    if (phase === "desk") {
      const t = performance.now() / 1000;
      headset.current.position.set(REST.x, REST.y + Math.sin(t * 1.2) * 0.015 + hover.current * 0.12, REST.z);
      headset.current.rotation.set(REST_ROT.x, REST_ROT.y + Math.sin(t * 0.6) * 0.03, REST_ROT.z);
      headset.current.scale.setScalar(1);
      return;
    }

    // Donning: ease into the camera, lenses toward the viewer, scaling up so
    // the visor fills the frame in the last frames.
    const speed = reduceMotion ? 3.5 : 1 / DON_SECONDS;
    donProgress.current = Math.min(1, donProgress.current + dt * speed);
    const p = donProgress.current;
    const eased = 1 - Math.pow(1 - p, 3);

    camera.getWorldDirection(camTarget.current);
    camTarget.current.multiplyScalar(0.9).add(camera.position);
    camQuat.current.copy(camera.quaternion).multiply(flip);

    headset.current.position.lerpVectors(REST, camTarget.current, eased);
    headset.current.quaternion.slerpQuaternions(restQuat, camQuat.current, eased);
    headset.current.scale.setScalar(1 + eased * 0.35);

    if (p >= 1) setPhase("boot");
  });

  const pickUp = () => {
    if (phase !== "desk") return;
    sfx.pinch();
    setPhase("donning");
  };

  // Gone entirely once it is on your face — the lamp with it.
  if (!visible) return null;

  return (
    <group>
      {/* The lamp: one warm point light. The only light in the site. */}
      <pointLight position={[1.7, 1.3, 6.6]} intensity={42} distance={12} decay={2} color="#ffd2a0" />
      {/* Cool fill from the window, so the shadow side is not pure black. */}
      <pointLight position={[-3, 1.4, 2]} intensity={10} distance={14} decay={2} color="#5a7fd0" />
      <ambientLight intensity={0.35} color="#8fb0ff" />
      <mesh position={[1.7, 1.3, 6.6]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffe6c4" />
      </mesh>

      <WindowGlow />

      <Desk />

      <Headset
        ref={headset}
        hover={hover}
        onHover={(on) => {
          hovering.current = on;
          hand.hovering = on ? 1 : 0;
          if (on) sfx.tick();
        }}
        onPick={pickUp}
      />

      <Controller position={[-1.35, DESK_Y + 0.13, 5.9]} rotation={[0.2, 0.5, 1.45]} hover={hover} />
      <Controller position={[1.25, DESK_Y + 0.13, 6.0]} rotation={[0.2, -0.6, -1.45]} hover={hover} />

      <Mug position={[2.1, DESK_Y, 4.6]} />
      <Notebook position={[-1.9, DESK_Y + 0.015, 4.5]} />
    </group>
  );
}

/** The city at night through a window, out of focus, behind the desk. */
function WindowGlow() {
  const texture = useWindowTexture();
  return (
    <mesh position={[-2.5, 1.4, DESK_Z - 4]}>
      <planeGeometry args={[3.2, 2.2]} />
      <meshBasicMaterial map={texture} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

/** A wooden desk top with a procedural grain, plus a front edge. */
function Desk() {
  const wood = useWoodTexture();
  return (
    <group>
      <mesh position={[0, DESK_Y, DESK_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial map={wood} color="#8a6242" roughness={0.72} metalness={0} />
      </mesh>
      <mesh position={[0, DESK_Y - 0.06, DESK_Z + 2.5]}>
        <boxGeometry args={[9, 0.12, 0.02]} />
        <meshStandardMaterial color="#3a2618" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * A stylised headset from primitives: light visor, dark facial interface,
 * strap ring, two lenses on the back face, and a status LED that breathes.
 */
function Headset({
  ref,
  hover,
  onHover,
  onPick,
}: {
  ref: React.Ref<THREE.Group>;
  hover: React.RefObject<number>;
  onHover: (on: boolean) => void;
  onPick: () => void;
}) {
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const led = useRef<THREE.MeshBasicMaterial>(null);
  const ledColor = useMemo(() => ({ dim: new THREE.Color("#153a7a"), bright: new THREE.Color("#6aa6ff") }), []);

  useFrame(({ clock }) => {
    if (halo.current) halo.current.opacity = 0.06 + hover.current * 0.22;
    if (led.current) {
      const breathe = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.6);
      led.current.color.copy(ledColor.dim).lerp(ledColor.bright, breathe * 0.7 + hover.current * 0.3);
    }
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
      <RoundedBox args={[1.5, 0.78, 0.7]} radius={0.16} smoothness={6} position={[0, 0, 0.1]}>
        <meshStandardMaterial color="#e6e3dc" roughness={0.55} metalness={0.05} />
      </RoundedBox>
      <RoundedBox args={[1.28, 0.6, 0.06]} radius={0.1} smoothness={4} position={[0, 0.02, 0.47]}>
        <meshStandardMaterial color="#cfcbc3" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.42, 0.7, 0.32]} radius={0.14} smoothness={4} position={[0, -0.02, -0.3]}>
        <meshStandardMaterial color="#141416" roughness={1} />
      </RoundedBox>

      {/* Lenses on the back face. */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0, -0.47]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.17, 32]} />
          <meshStandardMaterial color="#0a0d14" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}

      {/* Status LED, breathing on the front face. */}
      <mesh position={[0.5, -0.2, 0.505]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshBasicMaterial ref={led} color="#153a7a" />
      </mesh>

      {/* Strap. */}
      <mesh position={[0, 0.02, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.52, 0.045, 10, 40, Math.PI]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.9} />
      </mesh>

      {/* Hover halo. */}
      <mesh scale={[1.9, 1.3, 1.6]}>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshBasicMaterial ref={halo} color="#6aa6ff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Controller({
  position,
  rotation,
  hover,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  hover: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  // A little rattle when the headset next to them is hovered.
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = rotation[2] + Math.sin(clock.elapsedTime * 28) * 0.03 * hover.current;
  });
  return (
    <group ref={group} position={position} rotation={rotation}>
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

function Mug({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.13, 0.115, 0.24, 24]} />
        <meshStandardMaterial color="#2b2d36" roughness={0.6} />
      </mesh>
      <mesh position={[0.15, 0.12, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.07, 0.02, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#2b2d36" roughness={0.6} />
      </mesh>
      {/* Coffee. */}
      <mesh position={[0, 0.225, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 24]} />
        <meshStandardMaterial color="#2a180d" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Notebook({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.18, 0]}>
      <mesh>
        <boxGeometry args={[0.95, 0.03, 1.25]} />
        <meshStandardMaterial color="#1d2230" roughness={0.85} />
      </mesh>
      <mesh position={[-0.42, 0.016, 0]}>
        <boxGeometry args={[0.06, 0.005, 1.25]} />
        <meshStandardMaterial color="#3a4358" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Procedural wood grain: stripes with noise, drawn once to a canvas. */
function useWoodTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#7a5638";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 1) {
      const wobble = Math.sin(y * 0.05) * 6 + Math.sin(y * 0.013) * 14;
      const shade = 0.82 + 0.18 * Math.sin(y * 0.6 + wobble * 0.3) * Math.sin(y * 0.07);
      ctx.fillStyle = `rgba(40,22,12,${(1 - shade) * 0.9})`;
      ctx.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 2400; i += 1) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 3, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1.2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/** Soft city bokeh for the window. */
function useWindowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 176;
    const ctx = canvas.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 176);
    sky.addColorStop(0, "#0b1a3a");
    sky.addColorStop(1, "#1a1230");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 176);
    for (let i = 0; i < 40; i += 1) {
      const x = Math.random() * 256;
      const y = 60 + Math.random() * 110;
      const r = 3 + Math.random() * 9;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = Math.random() > 0.4;
      g.addColorStop(0, warm ? "rgba(255,205,140,0.9)" : "rgba(140,190,255,0.9)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}
