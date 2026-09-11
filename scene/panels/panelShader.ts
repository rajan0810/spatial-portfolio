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
    // Do not rename to "half" — reserved word in GLSL, fails to compile.
    vec2 halfExtent = vec2(uAspect, 1.0) * 0.5;
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);

    float d = roundedBoxSDF(p, halfExtent, uRadius);

    // Antialias the silhouette using the screen-space derivative, so the
    // corners stay clean at any distance down the rail.
    float aa = fwidth(d);
    float mask = 1.0 - smoothstep(-aa, aa, d);

    if (mask <= 0.001) discard;

    // --- fill ---------------------------------------------------------------
    bool textured = uHasMap > 0.5;
    vec3 color = uFill;

    if (textured) {
      color = texture2D(uMap, vUv).rgb;
    } else {
      // Glass must be LIGHTER than the environment it sits in, or it reads as a
      // hole rather than a surface. uFill is deliberately well above the
      // backdrop's ~0.03, and the sheen brightens toward the top so the panel
      // looks lit from above.
      float sheen = smoothstep(0.0, 1.0, vUv.y);
      color += uAccent * (0.10 + sheen * 0.14);
    }

    // --- border -------------------------------------------------------------
    // A bright line of *constant screen width*, sized from the derivative so it
    // stays a crisp 2px whether the panel is close or far down the rail. The
    // previous exp() falloff was sub-pixel at every distance, which is why
    // nothing was visible.
    float borderWidth = aa * 1.6;
    float border = 1.0 - smoothstep(0.0, borderWidth, abs(d + borderWidth));

    // Soft bloom inward from the edge, in world units, giving the glass depth.
    float innerGlow = exp(-abs(d) * 9.0);

    float lift = 0.7 + uHover * 0.85;
    color += uAccent * border * lift * 1.9;
    color += uAccent * innerGlow * (0.2 + uHover * 0.3);
    color += uAccent * uHover * 0.05;

    // --- grain --------------------------------------------------------------
    color += (grain(vUv * 512.0 + uTime * 0.5) - 0.5) * 0.018;

    // Video reads nearly opaque; empty glass stays translucent so the
    // environment shows through it.
    float baseAlpha = textured ? 0.96 : 0.58;
    float alpha = mask * uOpacity * clamp(baseAlpha + border * 0.5, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;
