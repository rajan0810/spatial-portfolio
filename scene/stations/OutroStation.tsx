"use client";

import { STATIONS } from "@/lib/stations";

import { Panel } from "../panels/Panel";
import { StationGroup, stationFade } from "./StationGroup";

/**
 * The closing panel — "invite to my world". The contact details themselves live
 * in the DOM overlay, as real links.
 */
export function OutroStation({ index }: { index: number }) {
  const z = STATIONS[index].z;

  return (
    <StationGroup index={index}>
      <Panel
        width={6.2}
        height={3.4}
        position={[0, 1.0, z]}
        curve={0.55}
        radius={0.12}
        opacity={0}
        onFrame={stationFade(index)}
      />
      {/* Two receding echoes, so the rail reads as continuing past the end
          rather than hitting a wall. */}
      <Panel
        width={4.6}
        height={2.5}
        position={[0, 1.0, z - 3.2]}
        curve={0.55}
        radius={0.12}
        opacity={0}
        onFrame={stationFade(index, 0.35)}
      />
      <Panel
        width={3.2}
        height={1.8}
        position={[0, 1.0, z - 5.8]}
        curve={0.55}
        radius={0.12}
        opacity={0}
        onFrame={stationFade(index, 0.15)}
      />
    </StationGroup>
  );
}
