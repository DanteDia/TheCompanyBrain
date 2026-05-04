"use client";

/**
 * GradientSphere — wireframe sphere replicating radicalsoftware.xyz/labs/
 * gradient-sphere. Three things that took me 6 iterations to figure out:
 *
 * 1. The "translucent / glowing" look comes from DOUBLE-SIDED wireframe with
 *    AdditiveBlending. You see the FRONT face's lines AND the BACK face's
 *    lines simultaneously, summed; overlap regions glow brighter. That's
 *    the depth perception that made my single-mesh approach look flat.
 *
 * 2. A linear mix(colorA, colorB, t) between TWO colors always gives
 *    muddy mid-tones in the transition zone. The original uses a ramp
 *    of 5+ stops — bright cyan, orange, deep red, near-black — so the
 *    surface reads as PATCHES of distinct color, never mid-mud.
 *
 * 3. FBM (fractional Brownian motion = sum of noise octaves) gives the
 *    color field more texture. A single simplex octave produces smooth
 *    blobs; FBM gives organic streaks/patches like the reference.
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

const PHASE_CONFIG: Record<SpherePhase, PhaseConfig> = {
  // Speaking is now ~4x slower than the previous draft (per Dante feedback:
  // the sphere felt frantic). Amp also dropped a touch so big bulges don't
  // clip against the canvas edges. Listening proportionally calmer too.
  idle:        { noiseSpeed: 0.06, noiseFreq: 1.10, noiseAmp: 0.24, paletteMult: 0.85, rotationSpeed: 0.06, meshScale: 1.00 },
  connecting:  { noiseSpeed: 0.13, noiseFreq: 1.10, noiseAmp: 0.30, paletteMult: 0.92, rotationSpeed: 0.18, meshScale: 1.02 },
  // LISTENING — almost still
  listening:   { noiseSpeed: 0.04, noiseFreq: 1.10, noiseAmp: 0.18, paletteMult: 0.75, rotationSpeed: 0.04, meshScale: 0.98 },
  // SPEAKING — alive but not frantic. ~4x slower than before.
  speaking:    { noiseSpeed: 0.16, noiseFreq: 1.10, noiseAmp: 0.36, paletteMult: 1.00, rotationSpeed: 0.21, meshScale: 1.04 },
  ended:       { noiseSpeed: 0.02, noiseFreq: 1.10, noiseAmp: 0.16, paletteMult: 0.55, rotationSpeed: 0.02, meshScale: 0.96 },
};

// Standard Ashima 3D simplex noise.
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

// FBM = sum of 4 octaves of simplex with halving amplitude / doubling freq.
// Produces a richer, more textured noise field than a single sample.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
`;

// 5-stop palette ramp: deep blue → cyan → cream/orange → red → dark.
// Lookup samples this in the fragment shader to avoid muddy mid-tones.
const PALETTE_GLSL_DARK = `
vec3 palette(float t) {
  // Stops tuned for dark bg — bright zones glow with AdditiveBlending.
  vec3 c0 = vec3(0.04, 0.05, 0.10);    // deep midnight
  vec3 c1 = vec3(0.18, 0.55, 0.92);    // bright cyan-blue
  vec3 c2 = vec3(0.95, 0.88, 0.78);    // warm cream highlight
  vec3 c3 = vec3(1.00, 0.50, 0.15);    // bright orange
  vec3 c4 = vec3(0.55, 0.10, 0.04);    // deep red-rust
  vec3 c5 = vec3(0.06, 0.03, 0.02);    // near-black warm

  t = clamp(t, 0.0, 1.0);
  if (t < 0.20)      return mix(c0, c1, t / 0.20);
  else if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
  else if (t < 0.60) return mix(c2, c3, (t - 0.40) / 0.20);
  else if (t < 0.80) return mix(c3, c4, (t - 0.60) / 0.20);
  else               return mix(c4, c5, (t - 0.80) / 0.20);
}
`;

const PALETTE_GLSL_LIGHT = `
vec3 palette(float t) {
  // Stops tuned for light bg — deeper saturation so colors READ against
  // white. Light/pastel colors would just disappear.
  vec3 c0 = vec3(0.10, 0.08, 0.05);    // near-black
  vec3 c1 = vec3(0.20, 0.36, 0.62);    // deep slate blue
  vec3 c2 = vec3(0.65, 0.50, 0.32);    // warm bronze midtone
  vec3 c3 = vec3(0.85, 0.36, 0.08);    // saturated terracotta
  vec3 c4 = vec3(0.45, 0.08, 0.03);    // deep brick red
  vec3 c5 = vec3(0.08, 0.05, 0.04);    // warm near-black

  t = clamp(t, 0.0, 1.0);
  if (t < 0.20)      return mix(c0, c1, t / 0.20);
  else if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
  else if (t < 0.60) return mix(c2, c3, (t - 0.40) / 0.20);
  else if (t < 0.80) return mix(c3, c4, (t - 0.60) / 0.20);
  else               return mix(c4, c5, (t - 0.80) / 0.20);
}
`;

const VERTEX_SHADER = `
${SIMPLEX_GLSL}
uniform float u_time;
uniform float u_noise_speed;
uniform float u_noise_freq;
uniform float u_noise_amp;
varying float v_color_t;
varying vec3 v_normal;
varying vec3 v_pos;
void main() {
  vec3 pos = position;

  // Displacement: FBM at low freq for big organic bulges
  vec3 d_input = pos * u_noise_freq + vec3(u_time * u_noise_speed);
  float d = fbm(d_input);
  pos += normal * d * u_noise_amp;

  // Color noise: independent FBM at higher freq, different time scale.
  // This is what we map through the 5-stop palette ramp.
  vec3 c_input = position * (u_noise_freq * 1.7) +
                 vec3(11.3, 47.7, -23.1) +
                 vec3(u_time * u_noise_speed * 0.55);
  v_color_t = 0.5 + 0.5 * fbm(c_input); // remap to 0..1

  v_normal = normalize(normalMatrix * normal);
  v_pos = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Wireframe fragment — palette-sampled color. Two variants generated
// from the theme prop: dark uses AdditiveBlending, light uses Normal.
const wireFragment = (paletteSrc: string, isLight: boolean) => `
${paletteSrc}
precision highp float;
uniform float u_palette_mult;
varying float v_color_t;
varying vec3 v_normal;
void main() {
  // Stretch t around 0.5 by paletteMult to get more contrast/extremes.
  float t = (v_color_t - 0.5) * u_palette_mult + 0.5;
  vec3 col = palette(t);

  // Soft edge fade so the rim of the sphere doesn't have a hard ring
  // (since wireframe + double-sided would otherwise bunch up at the silhouette).
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float ndotv = abs(dot(normalize(v_normal), viewDir));
  float silhouette = smoothstep(0.0, 0.4, ndotv);

  // Light theme: deepen the color a touch since NormalBlending wont add
  // brightness like Additive does, plus we render on white bg.
  ${isLight ? "col *= 0.75;" : "col *= 1.15;"}
  gl_FragColor = vec4(col, silhouette * ${isLight ? 0.95 : 0.9});
}
`;

// Soft fill behind the wireframe — gives the sphere body so it's not pure
// stick-figure. Uses the same palette but at lower intensity.
const fillFragment = (paletteSrc: string, isLight: boolean) => `
${paletteSrc}
precision highp float;
uniform float u_palette_mult;
varying float v_color_t;
varying vec3 v_normal;
void main() {
  float t = (v_color_t - 0.5) * u_palette_mult + 0.5;
  vec3 col = palette(t);

  // Strong fresnel so the body fades to dark in the center, leaving the
  // wireframe as the dominant feature. The silhouette glows.
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - abs(dot(normalize(v_normal), viewDir)), 2.2);
  gl_FragColor = vec4(col, 0.35 * fresnel);
}
`;

interface Props {
  phase: SpherePhase;
  level?: number;
  size?: number;
  className?: string;
  /** "dark" (default) glows on dark bg via AdditiveBlending. "light"
   *  uses dark wireframe + NormalBlending so it reads on white bg. */
  theme?: "dark" | "light";
}

export function GradientSphere({ phase, level = 0, size = 360, className, theme = "dark" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<SpherePhase>(phase);
  const levelRef = useRef<number>(level);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isLight = theme === "light";
    const paletteSrc = isLight ? PALETTE_GLSL_LIGHT : PALETTE_GLSL_DARK;
    const wireSrc = wireFragment(paletteSrc, isLight);
    const fillSrc = fillFragment(paletteSrc, isLight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4.0);  // extra room so deformed bulges never clip frame

    // Dense icosahedron for crisp lattice. detail=6 → 80k tris.
    const geometry = new THREE.IcosahedronGeometry(1.0, 6);

    const uniforms = {
      u_time: { value: 0 },
      u_noise_speed: { value: PHASE_CONFIG.idle.noiseSpeed },
      u_noise_freq: { value: PHASE_CONFIG.idle.noiseFreq },
      u_noise_amp: { value: PHASE_CONFIG.idle.noiseAmp },
      u_palette_mult: { value: PHASE_CONFIG.idle.paletteMult },
    };

    // Soft fill — gives a hint of body, fades fresnel-style to transparent
    // in the center so it doesn't compete with the wireframe.
    const fillMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: fillSrc,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(geometry, fillMaterial);
    fillMesh.scale.setScalar(0.985);

    // Wireframe — the protagonist. DoubleSide + AdditiveBlending so front
    // and back faces' lines render simultaneously and stack up where they
    // overlap, producing the translucent depth look of the reference.
    const wireMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: wireSrc,
      wireframe: true,
      transparent: true,
      side: THREE.DoubleSide,
      // Dark theme: AdditiveBlending so back+front lines glow together.
      // Light theme: NormalBlending — additive on white bg blows everything to white.
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: !isLight, // dark theme shows back faces through; light theme draws cleanly on white
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

      const cfg = PHASE_CONFIG[phaseRef.current];
      const lvl = levelRef.current;
      const targetAmp = cfg.noiseAmp + lvl * 0.10;  // tame audio-amp boost too
      const targetSpeed = cfg.noiseSpeed + lvl * 0.10;
      const targetRot = cfg.rotationSpeed + lvl * 0.10;
      const targetScale = cfg.meshScale + lvl * 0.04;

      const k = 1 - Math.exp(-dt * 4.5);  // snappier phase transitions
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
  }, [size, theme]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
