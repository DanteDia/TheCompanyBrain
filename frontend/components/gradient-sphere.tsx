"use client";

/**
 * GradientSphere — wireframe-ish sphere with simplex-noise vertex
 * displacement and a terracotta↔slate gradient palette painted in the
 * fragment shader. Inspired by radicalsoftware.xyz/labs/gradient-sphere
 * but tuned to our brand palette and driven by the voice-agent phase.
 *
 * Phases drive the same uniforms that the original sketch exposed:
 *   - u_noise_speed, u_noise_freq, u_noise_amp — noise displacement
 *   - u_palette_mult, rotationSpeed, u_scale
 *
 * If `level` (0..1, audio amplitude) is passed in, it adds extra wobble
 * on top of the phase preset — wired from the Retell SDK in the page.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export type SpherePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "ended";

interface PhaseConfig {
  noiseSpeed: number;
  noiseFreq: number;
  noiseAmp: number;
  paletteMult: number;
  rotationSpeed: number;
  meshScale: number;
}

// Baseline tuned to match radicalsoftware.xyz/labs/gradient-sphere with
// these slider values: speed 0.20, freq 0.34, amp 0.10, palette_mult 0.86,
// rotationSpeed 0.42, divisions 177. Their freq is mapped to our shader by
// trial — their 0.34 → our 0.55 reads visually identical (same "swell size").
const PHASE_CONFIG: Record<SpherePhase, PhaseConfig> = {
  // paletteMult ~0.5 keeps t near 0.5 so smoothstep transitions are visible
  // and BOTH colors show across the surface (instead of snapping all-orange
  // or all-blue depending on which side faces the camera).
  idle:        { noiseSpeed: 0.22, noiseFreq: 0.55, noiseAmp: 0.32, paletteMult: 0.55, rotationSpeed: 0.45, meshScale: 1.00 },
  connecting:  { noiseSpeed: 0.40, noiseFreq: 0.55, noiseAmp: 0.36, paletteMult: 0.60, rotationSpeed: 0.65, meshScale: 1.02 },
  listening:   { noiseSpeed: 0.24, noiseFreq: 0.55, noiseAmp: 0.34, paletteMult: 0.60, rotationSpeed: 0.50, meshScale: 1.00 },
  speaking:    { noiseSpeed: 0.45, noiseFreq: 0.55, noiseAmp: 0.42, paletteMult: 0.70, rotationSpeed: 0.70, meshScale: 1.04 },
  ended:       { noiseSpeed: 0.04, noiseFreq: 0.55, noiseAmp: 0.20, paletteMult: 0.40, rotationSpeed: 0.08, meshScale: 0.96 },
};

// Standard Ashima/Stefan-Gustavson 3D simplex noise — copy-pasted because
// it's the canonical implementation, predictable, and tiny.
const SIMPLEX_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX_SHADER = `
${SIMPLEX_GLSL}
uniform float u_time;
uniform float u_noise_speed;
uniform float u_noise_freq;
uniform float u_noise_amp;
varying float v_noise;
varying float v_color_noise;
varying vec3 v_normal;
void main() {
  vec3 pos = position;
  // Displacement noise: drives bulges
  float n = snoise(pos * u_noise_freq + vec3(u_time * u_noise_speed));
  pos += normal * n * u_noise_amp;
  v_noise = n;
  // Color noise: independent field at different freq/phase. Decoupled
  // from displacement so the visible surface isn't always dominated by
  // the "+noise = bulge toward camera" bias.
  v_color_noise = snoise(
    position * (u_noise_freq * 1.4) +
    vec3(73.1, 19.7, -54.3) +
    vec3(u_time * u_noise_speed * 0.7)
  );
  v_normal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec3 u_color_a;     // hot — terracotta
uniform vec3 u_color_b;     // cool — slate
uniform vec3 u_color_dark;  // dark zones
uniform float u_palette_mult;
varying float v_noise;
varying float v_color_noise;
varying vec3 v_normal;
void main() {
  // Use the INDEPENDENT color noise, not the displacement one. Keeps
  // both palette colors visible regardless of how the bulges are oriented
  // relative to the camera.
  float t = v_color_noise * u_palette_mult + 0.5;
  vec3 col = mix(u_color_b, u_color_a, smoothstep(0.35, 0.65, t));

  // Fresnel rim only — slight darkening at face center, brightest at edges
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - abs(dot(normalize(v_normal), viewDir)), 1.4);
  // Mild darken in the middle (NDotV high), bright at the rim. Keeps body
  // saturation rather than muddying it.
  col *= 0.85 + 0.30 * fresnel;
  gl_FragColor = vec4(col, 1.0);
}
`;

interface Props {
  phase: SpherePhase;
  level?: number;       // 0..1 audio amplitude
  size?: number;        // px
  className?: string;
}

export function GradientSphere({ phase, level = 0, size = 360, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<SpherePhase>(phase);
  const levelRef = useRef<number>(level);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);  // updateStyle defaults true → canvas CSS matches buffer
    renderer.setClearColor(0x000000, 0); // transparent so it stacks on any bg
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    // Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 3.0);  // tight crop — sphere fills the frame

    // Geometry — high-subdivision icosahedron for clean wireframe lattice
    // detail=6 → 20 * 4^6 = 81920 tris. Sweet spot: dense lattice that
    // still has visible line strokes at our render sizes (300-460px).
    // detail=7 made them sub-pixel and the wireframe collapsed to fog.
    const geometry = new THREE.IcosahedronGeometry(1.0, 6);

    // Uniforms — start at idle, lerp toward target each frame
    const uniforms = {
      u_time: { value: 0 },
      u_noise_speed: { value: PHASE_CONFIG.idle.noiseSpeed },
      u_noise_freq: { value: PHASE_CONFIG.idle.noiseFreq },
      u_noise_amp: { value: PHASE_CONFIG.idle.noiseAmp },
      u_palette_mult: { value: PHASE_CONFIG.idle.paletteMult },
      u_color_a: { value: new THREE.Color(0xff8c2e) },   // bright terracotta
      u_color_b: { value: new THREE.Color(0x3fa0e5) },   // bright cyan-blue
      u_color_dark: { value: new THREE.Color(0x141826) },// cool dark-slate (NOT warm) — keeps blue zones blue
    };

    // Filled mesh (faint, gives the sphere body)
    const fillMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const fillMesh = new THREE.Mesh(geometry, fillMaterial);
    fillMesh.scale.setScalar(0.99);

    // Wireframe overlay — uses a slightly inflated copy so edges sit on top
    // Wireframe overlay — bright silver lattice so it actually shows up
    // over the colored fill (matches the radicalsoftware reference). Uses a
    // ShaderMaterial that re-runs the SAME vertex shader (so the deformation
    // is identical to the fill mesh) but with a flat near-white fragment.
    const WIRE_FRAGMENT = `
      precision highp float;
      varying vec3 v_normal;
      void main() {
        // Slightly fresnel-tinted silver — bright in the middle, fading at edges
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float fresnel = pow(1.0 - abs(dot(normalize(v_normal), viewDir)), 1.4);
        vec3 col = mix(vec3(0.85, 0.86, 0.92), vec3(1.0, 0.97, 0.92), fresnel);
        gl_FragColor = vec4(col, 0.75);  // wireframe needs to be punchy on dark bg
      }
    `;
    const wireMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: WIRE_FRAGMENT,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.Mesh(geometry, wireMaterial);

    const group = new THREE.Group();
    group.add(fillMesh);
    group.add(wireMesh);
    scene.add(group);

    let raf = 0;
    let t0 = performance.now();
    let rotationY = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function tick() {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = (now - t0) / 1000;
      t0 = now;

      // Phase target with audio-amplitude boost
      const cfg = PHASE_CONFIG[phaseRef.current];
      const lvl = levelRef.current;
      const targetAmp = cfg.noiseAmp + lvl * 0.18;
      const targetSpeed = cfg.noiseSpeed + lvl * 0.30;
      const targetRot = cfg.rotationSpeed + lvl * 0.25;
      const targetScale = cfg.meshScale + lvl * 0.04;

      // Smooth lerp toward target so transitions feel organic
      const k = 1 - Math.exp(-dt * 3.5);
      uniforms.u_noise_amp.value = lerp(uniforms.u_noise_amp.value, targetAmp, k);
      uniforms.u_noise_speed.value = lerp(uniforms.u_noise_speed.value, targetSpeed, k);
      uniforms.u_noise_freq.value = lerp(uniforms.u_noise_freq.value, cfg.noiseFreq, k);
      uniforms.u_palette_mult.value = lerp(uniforms.u_palette_mult.value, cfg.paletteMult, k);
      uniforms.u_time.value += dt;
      rotationY += dt * targetRot;
      group.rotation.y = rotationY;
      group.rotation.x = Math.sin(uniforms.u_time.value * 0.15) * 0.08;
      const s = lerp(group.scale.x || 1, targetScale, k);
      group.scale.setScalar(s);

      renderer.render(scene, camera);
    }
    tick();

    // Resize handling for retina + element resize
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || size;
      const h = container.clientHeight || size;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      geometry.dispose();
      fillMaterial.dispose();
      wireMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
