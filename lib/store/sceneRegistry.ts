import type * as THREE from "three";

import type { StationId } from "@/lib/stations";

/**
 * Live scene objects by station, so the editor can outline and attach a gizmo
 * to whatever is selected without threading refs through every component.
 * StationGroup registers itself on mount and removes itself on unmount.
 */
export const sceneRegistry = new Map<StationId, THREE.Group>();
