import * as THREE from "three";

/**
 * A plane bent into a cylindrical arc, concave toward the viewer — the shape
 * every Quest system panel uses.
 *
 * Built by displacing a PlaneGeometry rather than slicing a CylinderGeometry so
 * the UVs stay the plain 0→1 grid a texture expects, with no mirroring or
 * seam to work around.
 *
 * @param arc total sweep in radians. 0 leaves the plane flat.
 */
export function createCurvedPlane(
  width: number,
  height: number,
  arc = 0.45,
  segments = 32,
) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, 1);

  if (arc > 0.001) {
    const radius = width / arc;
    const position = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const angle = x / radius;
      position.setX(i, radius * Math.sin(angle));
      // Edges bow toward +Z (the camera), giving the concave wrap.
      position.setZ(i, radius - radius * Math.cos(angle));
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  return geometry;
}
