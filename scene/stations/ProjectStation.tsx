"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { ProjectView } from "@/lib/data/types";
import { damp, rail } from "@/lib/store/rail";
import { STATIONS, stationWeight } from "@/lib/stations";

import { Panel } from "../panels/Panel";
import { VideoPanel } from "../panels/VideoPanel";
import { StationGroup, stationFade } from "./StationGroup";

/**
 * A project as a triptych rather than a card.
 *
 * The centre panel carries the demo loop; the flanking panels stand for the
 * other surfaces the project runs on. For a project spanning a headset, a phone
 * and a server, that arrangement makes the range visible at a glance — which is
 * the whole argument the site is making — instead of burying it in a tech list.
 *
 * Layout adapts: the first tech surface owns the centre screen, and up to two
 * more get wings.
 */
export function ProjectStation({
  index,
  project,
}: {
  index: number;
  project: ProjectView;
}) {
  const z = STATIONS[index].z;
  const [, ...wings] = project.tech;

  return (
    <StationGroup index={index}>
      {/* Centre: the demo loop. Falls back to empty glass when no video exists. */}
      <VideoPanel
        url={project.loopVideoUrl}
        width={6.4}
        height={3.6}
        position={[0, 1.05, z]}
        curve={0.4}
        radius={0.06}
        opacity={0}
        onFrame={stationFade(index)}
      />

      <SurfaceLabel
        index={index}
        text={project.tech[0]?.surface ?? "Demo"}
        position={[0, 3.2, z + 0.35]}
        size={0.2}
      />

      {wings[0] ? (
        <Wing
          index={index}
          surface={wings[0]}
          width={1.9}
          height={3.3}
          position={[-4.6, 0.95, z + 1.5]}
          rotation={[0, 0.44, 0]}
        />
      ) : null}

      {wings[1] ? (
        <Wing
          index={index}
          surface={wings[1]}
          width={3.3}
          height={2.3}
          position={[4.5, 1.05, z + 1.3]}
          rotation={[0, -0.4, 0]}
        />
      ) : null}
    </StationGroup>
  );
}

function Wing({
  index,
  surface,
  width,
  height,
  position,
  rotation,
}: {
  index: number;
  surface: { surface: string; items: string[] };
  width: number;
  height: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <Panel
        width={width}
        height={height}
        curve={0.3}
        radius={0.08}
        opacity={0}
        onFrame={stationFade(index, 0.85)}
      />
      <SurfaceLabel
        index={index}
        text={surface.surface}
        position={[0, height / 2 + 0.28, 0.1]}
        size={0.15}
      />
      <SurfaceLabel
        index={index}
        text={surface.items.join("\n")}
        position={[0, 0, 0.12]}
        size={0.12}
        color="#93a1ba"
        lineHeight={1.9}
      />
    </group>
  );
}

/**
 * Short in-scene label. Prose lives in the DOM overlay where it is selectable
 * and reachable by a screen reader; only labels that must sit *in space* are
 * drawn here, as SDF text.
 */
function SurfaceLabel({
  index,
  text,
  position,
  size,
  color = "#e8edf7",
  lineHeight = 1.3,
}: {
  index: number;
  text: string;
  position: [number, number, number];
  size: number;
  color?: string;
  lineHeight?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const material = mesh.current?.material as
      | (THREE.Material & { opacity: number })
      | undefined;
    if (!material) return;

    const weight = stationWeight(rail.progress, index, 0.8);
    material.opacity = damp(material.opacity, weight, 8, Math.min(delta, 1 / 20));
  });

  return (
    <Text
      ref={mesh}
      position={position}
      fontSize={size}
      color={color}
      lineHeight={lineHeight}
      letterSpacing={0.03}
      anchorX="center"
      anchorY="middle"
      textAlign="center"
      material-transparent
      material-opacity={0}
    >
      {text}
    </Text>
  );
}
