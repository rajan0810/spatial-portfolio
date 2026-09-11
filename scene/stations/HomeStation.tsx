"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { ProfileView } from "@/lib/data/types";
import { damp, rail } from "@/lib/store/rail";
import { STATIONS, stationWeight } from "@/lib/stations";

import { Panel } from "../panels/Panel";
import { StationGroup, stationFade } from "./StationGroup";

/**
 * The home environment: a wide backing panel with the headline in DOM on top of
 * it, flanked by social tiles shaped like Quest app icons.
 */
export function HomeStation({
  index,
  profile,
}: {
  index: number;
  profile: ProfileView;
}) {
  const z = STATIONS[index].z;

  const tiles = [
    profile.githubUrl ? { label: "GitHub", url: profile.githubUrl } : null,
    profile.linkedinUrl ? { label: "LinkedIn", url: profile.linkedinUrl } : null,
  ].filter((tile): tile is { label: string; url: string } => tile !== null);

  return (
    <StationGroup index={index}>
      {/* Backing panel — the DOM headline sits directly over this. */}
      <Panel
        width={8.4}
        height={3.4}
        position={[0, 2.4, z]}
        curve={0.5}
        radius={0.1}
        opacity={0}
        onFrame={stationFade(index)}
      />

      {/* Social tiles, placed as app icons on a shelf below the panel. */}
      {tiles.map((tile, i) => (
        <SocialTile
          key={tile.label}
          index={index}
          label={tile.label}
          url={tile.url}
          position={[(i - (tiles.length - 1) / 2) * 1.9, -0.5, z + 0.5]}
        />
      ))}
    </StationGroup>
  );
}

function SocialTile({
  index,
  label,
  url,
  position,
}: {
  index: number;
  label: string;
  url: string;
  position: [number, number, number];
}) {
  const text = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const material = text.current?.material as
      | (THREE.Material & { opacity: number })
      | undefined;
    if (!material) return;

    const weight = stationWeight(rail.progress, index, 0.55);
    material.opacity = damp(material.opacity, weight, 8, Math.min(delta, 1 / 20));
  });

  return (
    <group position={position}>
      <Panel
        width={1.5}
        height={1.5}
        curve={0.18}
        radius={0.22}
        hoverable
        opacity={0}
        onFrame={stationFade(index)}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      />
      <Text
        ref={text}
        position={[0, 0, 0.06]}
        fontSize={0.22}
        letterSpacing={0.04}
        color="#e8edf7"
        anchorX="center"
        anchorY="middle"
        material-transparent
        material-opacity={0}
      >
        {label}
      </Text>
    </group>
  );
}
