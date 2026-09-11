/**
 * One shader for every panel in the scene.
 *
 * Rounded corners, the edge glow, hover response, the video fill and the film
 * grain all happen here, in one material and one draw call. Doing the corners
 * with an SDF rather than alpha-mapped geometry is what keeps the panel count
 * cheap enough to hold the frame budget.
 */

export const panelVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const panelFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uTime;
  uniform vec3 uAccent;
  uniform vec3 uFill;

  // Signed distance to a rounded box. Negative inside.
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Cheap hash-based grain. Panels are glass, not plastic — a little noise
  // stops the large flat areas from banding.
  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 half = vec2(uAspect, 1.0) * 0.5;
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);

    float d = roundedBoxSDF(p, half, uRadius);

    // Antialias the silhouette using the screen-space derivative, so the
    // corners stay clean at any distance down the rail.
    float aa = fwidth(d) * 1.2;
    float mask = 1.0 - smoothstep(-aa, aa, d);

    if (mask <= 0.001) discard;

    // --- fill ---------------------------------------------------------------
    vec3 color = uFill;

    if (uHasMap > 0.5) {
      color = texture2D(uMap, vUv).rgb;
    } else {
      // Subtle vertical sheen so an empty panel still reads as glass.
      float sheen = smoothstep(0.0, 1.0, 1.0 - vUv.y) * 0.35;
      color += uAccent * sheen * 0.25;
    }

    // --- edge glow ----------------------------------------------------------
    // Bright hairline right at the border, falling off inward. This is the
    // single detail that makes the panel read as Quest UI.
    float edge = exp(-abs(d) * 90.0);
    float innerGlow = exp(-abs(d) * 12.0) * 0.25;
    float glowStrength = 0.55 + uHover * 0.9;

    color += uAccent * (edge * glowStrength + innerGlow * (0.4 + uHover * 0.6));

    // Hover lifts the whole surface slightly, like a focused Quest panel.
    color += uAccent * uHover * 0.06;

    // --- grain --------------------------------------------------------------
    color += (grain(vUv * 512.0 + uTime * 0.5) - 0.5) * 0.018;

    // Glass is never fully opaque; the edge is the most solid part of it.
    float alpha = mask * uOpacity * (0.82 + edge * 0.18);

    gl_FragColor = vec4(color, alpha);
  }
`;
