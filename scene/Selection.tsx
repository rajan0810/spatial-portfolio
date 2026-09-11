"use client";

import { TransformControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { stationFor, useEditor } from "@/lib/store/editor";
import { sceneRegistry } from "@/lib/store/sceneRegistry";

/**
 * The selection outline and move gizmo.
 *
 * An orange bounding box around whatever station the hierarchy selection
 * resolves to, recomputed each frame so it follows grabbed panels, plus a
 * real translate gizmo attached to the station group. Drag it and the
 * station moves; the console logs the transform like an editor would.
 */
export function Selection() {
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const log = useEditor((s) => s.log);
  const [target, setTarget] = useState<THREE.Group | null>(null);

  const box = useMemo(() => new THREE.Box3(), []);
  const outline = useRef<THREE.LineSegments>(null);
  const size = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  /**
   * Station groups live at the world origin with their contents placed at
   * absolute depth, so a gizmo on the group itself would sit at z=0, far from
   * what is selected. The gizmo drives this proxy at the selection's centre
   * instead, and the group follows by the same offset.
   */
  const proxy = useMemo(() => new THREE.Object3D(), []);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const dragging = useRef(false);

  const station = stationFor(nodes, selectedId);

  // Resolve the selected station to its live group. Registered groups can
  // arrive after selection (stations mount lazily), so poll briefly.
  useEffect(() => {
    if (!station) {
      setTarget(null);
      return;
    }
    const found = sceneRegistry.get(station) ?? null;
    setTarget(found);
    if (found) return;
    const id = window.setInterval(() => {
      const late = sceneRegistry.get(station);
      if (late) {
        setTarget(late);
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [station]);

  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  useEffect(() => () => edges.dispose(), [edges]);

  useFrame(() => {
    if (!outline.current) return;
    if (!target) {
      outline.current.visible = false;
      return;
    }
    box.setFromObject(target);
    if (box.isEmpty()) {
      outline.current.visible = false;
      return;
    }
    box.getSize(size);
    box.getCenter(center);
    outline.current.visible = true;
    outline.current.position.copy(center);
    outline.current.scale.set(size.x + 0.15, size.y + 0.15, size.z + 0.15);

    if (dragging.current) {
      // The gizmo moved the proxy; carry the group with it.
      target.position.copy(proxy.position).sub(anchor);
    } else {
      // Keep the proxy on the selection between drags (grabbed panels move it).
      proxy.position.copy(center);
      anchor.copy(center).sub(target.position);
    }
  });

  return (
    <>
      <lineSegments ref={outline} geometry={edges} visible={false} renderOrder={10}>
        <lineBasicMaterial color="#ff9a3c" transparent opacity={0.9} depthTest={false} />
      </lineSegments>

      <primitive object={proxy} />
      {target ? (
        <TransformControls
          object={proxy}
          mode="translate"
          size={0.8}
          onMouseDown={() => {
            dragging.current = true;
          }}
          onMouseUp={() => {
            dragging.current = false;
            const p = target.position;
            log("info", `Transform ${station} → (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
          }}
        />
      ) : null}
    </>
  );
}
