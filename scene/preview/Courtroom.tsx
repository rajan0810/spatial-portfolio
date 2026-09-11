"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { rail } from "@/lib/store/rail";
import { stationWeight } from "@/lib/stations";

/**
 * A procedural courtroom, rendered to a texture.
 *
 * Until a real demo loop exists for JustiX, its panel shows this instead: a
 * small lit scene of a judge's bench, two lecterns, a human figure at one and
 * an adversarial AI at the other, with a slow camera orbit and the occasional
 * gavel strike. It is a placeholder that shows craft rather than a grey box,
 * and it demonstrates the project's premise in a glance.
 *
 * Renders only while the JustiX station is on screen, at a modest resolution,
 * into its own scene with its own lights — nothing here leaks into the main
 * environment.
 */
export function useCourtroomTexture(stationIndex: number) {
  const { gl } = useThree();

  const world = useMemo(() => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#1a0e0a", 6, 14);
    scene.background = new THREE.Color("#1a0e0a");

    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 40);
    const target = new THREE.WebGLRenderTarget(768, 432, { depthBuffer: true });
    target.texture.colorSpace = THREE.SRGBColorSpace;

    const wood = new THREE.MeshStandardMaterial({ color: "#4a2e1f", roughness: 0.75 });
    const darkWood = new THREE.MeshStandardMaterial({ color: "#2c1a12", roughness: 0.8 });
    const brass = new THREE.MeshStandardMaterial({ color: "#b8893a", roughness: 0.35, metalness: 0.7 });

    // Floor and back wall.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: "#241610", roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), darkWood);
    wall.position.set(0, 3, -4.2);
    scene.add(wall);

    // The bench, raised, with a rail and a nameplate.
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.5, 1.2), wood);
    bench.position.set(0, 0.75, -2.8);
    scene.add(bench);
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.35), darkWood);
    benchTop.position.set(0, 1.54, -2.8);
    scene.add(benchTop);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.04), brass);
    plate.position.set(0, 1.25, -2.18);
    scene.add(plate);

    // Judge: a robed silhouette behind the bench.
    const judge = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 14), new THREE.MeshStandardMaterial({ color: "#151015", roughness: 1 }));
    judge.position.set(0, 1.85, -3.1);
    scene.add(judge);

    // Two lecterns facing the bench.
    const lecternGeometry = new THREE.BoxGeometry(0.9, 1.1, 0.6);
    const left = new THREE.Mesh(lecternGeometry, wood);
    left.position.set(-1.7, 0.55, 0.4);
    scene.add(left);
    const right = new THREE.Mesh(lecternGeometry, wood);
    right.position.set(1.7, 0.55, 0.4);
    scene.add(right);

    // The human, at the left lectern.
    const human = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 6, 14), new THREE.MeshStandardMaterial({ color: "#cbb7a2", roughness: 0.9 }));
    human.position.set(-1.7, 1.15, 1.1);
    scene.add(human);
    const humanHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: "#d8c4ad", roughness: 0.9 }));
    humanHead.position.set(-1.7, 1.78, 1.1);
    scene.add(humanHead);

    // The adversarial AI, at the right lectern: a wireframe core with rings.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 1),
      new THREE.MeshBasicMaterial({ color: "#6aa6ff", wireframe: true, transparent: true, opacity: 0.9 }),
    );
    core.position.set(1.7, 1.55, 1.1);
    scene.add(core);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: "#8fc0ff" }));
    glow.position.copy(core.position);
    scene.add(glow);
    const rings = [0, 1].map((i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.5 + i * 0.16, 0.012, 8, 48),
        new THREE.MeshBasicMaterial({ color: "#6aa6ff", transparent: true, opacity: 0.7 }),
      );
      ring.position.copy(core.position);
      scene.add(ring);
      return ring;
    });

    // Gavel on the bench.
    const gavel = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), darkWood);
    handle.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), wood);
    head.rotation.x = Math.PI / 2;
    head.position.x = 0.22;
    gavel.add(handle, head);
    gavel.position.set(0.9, 1.62, -2.6);
    scene.add(gavel);

    // Lights: warm over the bench, cold on the AI, a little fill.
    const key = new THREE.PointLight("#ffc88a", 34, 14, 2);
    key.position.set(0, 4, -1.5);
    scene.add(key);
    const aiLight = new THREE.PointLight("#5a9cff", 6, 6, 2);
    aiLight.position.copy(core.position);
    scene.add(aiLight);
    scene.add(new THREE.AmbientLight("#6a4a38", 0.7));
    const strike = new THREE.PointLight("#ffe2b0", 0, 8, 2);
    strike.position.set(0.9, 2.2, -2.4);
    scene.add(strike);

    return { scene, camera, target, core, rings, gavel, strike, aiLight };
  }, []);

  useEffect(
    () => () => {
      world.target.dispose();
      world.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    },
    [world],
  );

  useFrame(({ clock }) => {
    // Nothing to see: skip the whole render.
    if (stationWeight(rail.progress, stationIndex, 0.9) <= 0.01) return;

    const t = clock.elapsedTime;
    const { scene, camera, target, core, rings, gavel, strike, aiLight } = world;

    // Slow orbit around the well of the court.
    const a = t * 0.12;
    camera.position.set(Math.sin(a) * 5.2, 1.9 + Math.sin(t * 0.3) * 0.15, Math.cos(a) * 5.2 + 0.8);
    camera.lookAt(0, 1.1, -0.6);

    core.rotation.y = t * 0.8;
    core.rotation.x = t * 0.35;
    const pulse = 0.85 + Math.sin(t * 3.1) * 0.15;
    core.scale.setScalar(pulse);
    aiLight.intensity = 5 + Math.sin(t * 3.1) * 2;
    rings[0].rotation.x = t * 0.9;
    rings[0].rotation.y = t * 0.4;
    rings[1].rotation.z = t * 0.7;
    rings[1].rotation.x = -t * 0.5;

    // Every ~5s the gavel comes down and the bench flashes.
    const cycle = t % 5.2;
    const swing = cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
    gavel.rotation.z = swing * 0.6;
    strike.intensity = cycle > 0.3 && cycle < 0.55 ? 14 * (1 - (cycle - 0.3) / 0.25) : 0;

    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(previous);
  });

  return world.target.texture;
}
