"use client";

import { useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { useExperience } from "@/lib/store/experience";
import { damp } from "@/lib/store/rail";

/**
 * Everything you see is seen through the lenses of the headset you put on.
 *
 * One full-screen pass: the scene renders to a texture, and a quad redraws it
 * with barrel distortion, chromatic fringing toward the edges, a circular lens
 * vignette, and — faintly — the screen-door effect: the subpixel grid that
 * every headset owner has learned to stop noticing. Anyone who has done VR
 * work will recognise it in a second, which is the point.
 *
 * Cost is a single extra fragment pass with no MSAA, which is the cheapest
 * post-process there is. Off on coarse-pointer devices and via the comfort
 * menu; when off, R3F's own renderer takes over and this component is inert.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D tScene;
  uniform vec2 uResolution;
  uniform float uDistortion;
  uniform float uAberration;
  uniform float uVignette;
  uniform float uScreenDoor;
  /** 0 on the desk (you are not wearing it), 1 once it is on your face. */
  uniform float uWear;

  vec2 barrel(vec2 uv, float k) {
    vec2 c = uv - 0.5;
    // Correct for aspect so the distortion is circular, not elliptical.
    c.x *= uResolution.x / uResolution.y;
    float r2 = dot(c, c);
    c *= 1.0 + k * r2;
    c.x /= uResolution.x / uResolution.y;
    return c + 0.5;
  }

  void main() {
    // Each channel is distorted by a slightly different amount: that is what
    // chromatic aberration physically is, and it is free.
    float k = uDistortion * uWear;
    vec2 uvR = barrel(vUv, k * (1.0 + uAberration));
    vec2 uvG = barrel(vUv, k);
    vec2 uvB = barrel(vUv, k * (1.0 - uAberration));

    vec3 color = vec3(
      texture2D(tScene, uvR).r,
      texture2D(tScene, uvG).g,
      texture2D(tScene, uvB).b
    );

    // Lens vignette: circular, soft, and it closes as uClose rises.
    vec2 c = vUv - 0.5;
    c.x *= uResolution.x / uResolution.y;
    float r = length(c) * 1.35;
    float edge = smoothstep(0.55, 1.05, r);
    color *= 1.0 - edge * uVignette * uWear;

    // Screen-door: a 3px subpixel grid, darkening the gaps a little.
    vec2 cell = fract(gl_FragCoord.xy / 3.0);
    float gap = min(smoothstep(0.0, 0.3, cell.x), smoothstep(0.0, 0.3, cell.y));
    color *= 1.0 - uScreenDoor * uWear * (1.0 - gap);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function LensPass() {
  const { size, viewport } = useThree();
  const lens = useExperience((s) => s.comfort.lens);
  const screenDoor = useExperience((s) => s.comfort.screenDoor);
  const phase = useExperience((s) => s.phase);

  const fbo = useFBO({ depthBuffer: true, stencilBuffer: false });

  const uniforms = useMemo(
    () => ({
      tScene: { value: null as THREE.Texture | null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDistortion: { value: 0.13 },
      uAberration: { value: 0.045 },
      uVignette: { value: 0.85 },
      uScreenDoor: { value: 0 },
      uWear: { value: 0 },
    }),
    [],
  );

  const quad = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { scene, camera, material };
  }, [uniforms]);

  useEffect(() => () => quad.material.dispose(), [quad]);

  useEffect(() => {
    uniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
  }, [size, viewport.dpr, uniforms]);

  // We issue two draws per frame, so stop three resetting its counters after
  // each one; PerfProbe reads the frame total and we reset it here.
  const { gl: renderer } = useThree();
  useEffect(() => {
    renderer.info.autoReset = false;
    return () => {
      renderer.info.autoReset = true;
    };
  }, [renderer]);

  // Positive priority: R3F stops rendering on its own and this loop owns it.
  useFrame(({ gl, scene, camera }, delta) => {
    gl.info.reset();
    const dt = Math.min(delta, 1 / 20);
    const wantSde = lens && screenDoor ? 0.16 : 0;
    uniforms.uScreenDoor.value = damp(uniforms.uScreenDoor.value, wantSde, 6, dt);

    // On the desk you see with your own eyes. The lens arrives with the
    // headset and leaves with it.
    const worn = phase === "desk" || phase === "doffing" ? 0 : 1;
    uniforms.uWear.value = damp(uniforms.uWear.value, worn, 2.2, dt);

    if (!lens) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    uniforms.tScene.value = fbo.texture;
    gl.render(quad.scene, quad.camera);
  }, 1);

  return null;
}
