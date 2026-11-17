"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial } from "@react-three/drei";
import { useInView, type MotionValue } from "motion/react";

// A liquid-glass sphere drawn in 3D. It wobbles gently, tilts toward the cursor,
// shimmers with the site's colours, and bends the slow dark waves behind it.
//
// The canvas is see-through and ignores the pointer, so it can sit over the page
// without blocking anything. Load it with next/dynamic and `ssr: false` (it needs
// the browser's WebGL), for example:
//
//   const GlassOrb = dynamic(() => import("@/components/GlassOrb"), { ssr: false });
//   <div className="relative h-56 w-56"><GlassOrb /></div>
//
// The orb fills the box it is placed in; the canvas itself reaches a little past
// the box so the waves and wobble have room.

const RADIUS = 1.35;
const CAMERA_Z = 5;
const FOV = 45;
const REST_WOBBLE = 0.2; // how uneven the surface is at rest
// How much bigger than the orb the canvas must be, so the orb exactly fills its box.
const VIEW_HEIGHT = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const OVERSCAN = ((VIEW_HEIGHT / (RADIUS * 2) - 1) / 2) * 100; // % added on each side

type Props = {
  /** 0 to 1: how lively the orb is right now (e.g. while speaking). Optional. */
  energy?: MotionValue<number>;
  /** Hold everything still, for visitors who prefer reduced motion. */
  still?: boolean;
  /** Called once the first frame is on screen. */
  onReady?: () => void;
  /** Called if this device can't draw the orb smoothly, so the page can show something lighter. */
  onSlow?: () => void;
};

export default function GlassOrb({ energy, still = false, onReady, onSlow }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap, { margin: "200px" });

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute" style={{ inset: `-${OVERSCAN}%` }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
        // Stop drawing while off screen; draw a single frame when motion is reduced.
        frameloop={!visible ? "never" : still ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <Scene energy={energy} still={still} onSlow={onSlow} />
      </Canvas>
    </div>
  );
}

function Scene({ energy, still, onSlow }: { energy?: MotionValue<number>; still: boolean; onSlow?: () => void }) {
  const tilt = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const glass = useRef<React.ComponentRef<typeof MeshDistortMaterial>>(null);
  const cursor = useRef({ x: 0, y: 0 }); // -1 to 1 across the window
  const level = useRef(0);
  const pace = useRef({ elapsed: 0, times: [] as number[], judged: false });

  // Follow the mouse across the whole window (the canvas itself ignores the pointer).
  useEffect(() => {
    const move = (e: PointerEvent) => {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((_, delta) => {
    if (still) return;
    // Is this device struggling (no graphics card, or a very old one)? Skip the
    // first 1.5 seconds, while the page is still loading, then look at the
    // typical frame over the next 3 seconds. Typical (the median) rather than
    // average, so a few one-off pauses don't count against it. Slower than about
    // 20 frames a second means struggling.
    const p = pace.current;
    if (!p.judged && !document.hidden && delta < 1) {
      p.elapsed += delta;
      if (p.elapsed > 1.5) p.times.push(delta);
      if (p.elapsed > 4.5) {
        p.judged = true;
        const sorted = [...p.times].sort((a, b) => a - b);
        if (sorted[Math.floor(sorted.length / 2)] > 0.05) onSlow?.();
      }
    }
    const ease = 1 - Math.exp(-4 * delta);
    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, -cursor.current.y * 0.4, ease);
      tilt.current.rotation.y = THREE.MathUtils.lerp(tilt.current.rotation.y, cursor.current.x * 0.4, ease);
    }
    // Swell and ripple more while "speaking".
    level.current = THREE.MathUtils.lerp(level.current, energy?.get() ?? 0, 1 - Math.exp(-10 * delta));
    orb.current?.scale.setScalar(1 + level.current * 0.07);
    if (glass.current) glass.current.distort = REST_WOBBLE + level.current * 0.25;
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Rim lights in the site's colours */}
      <pointLight position={[-3.2, 2.2, 2.5]} intensity={60} color="#e0ca3c" />
      <pointLight position={[3.4, -1.6, 2.2]} intensity={55} color="#f34213" />
      <pointLight position={[0.5, 3, -2.5]} intensity={70} color="#8a6fd1" />
      <pointLight position={[-2.5, -3, 1]} intensity={45} color="#2fb3a0" />

      {/* What the glass reflects: soft pools of the site's colours on a dark
          sky. Drawn here once, so nothing is downloaded. */}
      <Environment resolution={256} frames={1}>
        <mesh scale={50}>
          <sphereGeometry args={[1, 48, 48]} />
          <shaderMaterial args={[SKY]} />
        </mesh>
      </Environment>

      <group ref={tilt}>
        <Float speed={still ? 0 : 2} rotationIntensity={0.4} floatIntensity={0.6} floatingRange={[-0.05, 0.05]}>
          <mesh ref={orb}>
            <sphereGeometry args={[RADIUS, 128, 128]} />
            <MeshDistortMaterial
              ref={glass}
              color="#ffffff"
              transmission={0.95}
              thickness={1.5}
              roughness={0.08}
              ior={1.45}
              iridescence={1}
              iridescenceIOR={1.3}
              iridescenceThicknessMinimum={120}
              iridescenceThicknessMaximum={620}
              clearcoat={1}
              clearcoatRoughness={0.05}
              envMapIntensity={1.4}
              attenuationColor="#bff3e6"
              attenuationDistance={3.5}
              distort={REST_WOBBLE}
              speed={still ? 0 : 1.8}
            />
          </mesh>
        </Float>
      </group>

      <Waves still={still} />
    </>
  );
}

// Slow, dark silk-like waves behind the orb, so the glass has something moving
// to bend. It has to be a solid surface for the glass to refract it, so the
// shader fades its own edges out instead of using normal transparency.
function Waves({ still }: { still: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame((_, delta) => {
    if (!still && material.current) material.current.uniforms.uTime.value += delta;
  });
  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[7, 7]} />
      <shaderMaterial ref={material} args={[WAVES]} />
    </mesh>
  );
}

const WAVES: THREE.ShaderMaterialParameters = {
  blending: THREE.NoBlending,
  depthWrite: false,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color("#020d09") },
    uCrest: { value: new THREE.Color("#1c6b5a") },
    uWarm: { value: new THREE.Color("#3a2a12") },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uCrest;
    uniform vec3 uWarm;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      float t = uTime * 0.14;
      // Two layers of bending bands, like folds in silk.
      float a = sin(p.x * 3.2 + t * 2.0 + sin(p.y * 2.4 - t) * 1.5);
      float b = sin(p.y * 5.0 - t * 1.6 + cos(p.x * 2.8 + t * 1.2) * 1.9);
      float fold = smoothstep(-1.0, 1.0, a * 0.65 + b * 0.35);
      float ridge = pow(fold, 3.0);
      vec3 col = mix(uDeep, uCrest, ridge);
      col += uWarm * pow(1.0 - fold, 4.0) * 0.6;
      // Fade to nothing in a soft circle, so no rectangle shows on the page.
      float alpha = 0.9 * smoothstep(0.72, 0.12, length(p));
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `,
};

// The reflected "sky": a dark dome with soft glows of gold, flame, teal and
// violet, plus one small bright spot for a crisp highlight.
const SKY: THREE.ShaderMaterialParameters = {
  side: THREE.BackSide,
  toneMapped: false,
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vDir;
    float glow(vec3 d, vec3 toward, float tightness) {
      return pow(max(dot(d, normalize(toward)), 0.0), tightness);
    }
    void main() {
      vec3 d = normalize(vDir);
      vec3 col = vec3(0.008, 0.045, 0.034);
      col += vec3(0.88, 0.79, 0.24) * 2.6 * glow(d, vec3(-1.0, 0.5, 0.6), 3.0);
      col += vec3(0.95, 0.26, 0.07) * 2.4 * glow(d, vec3(1.0, -0.4, 0.5), 3.5);
      col += vec3(0.18, 0.70, 0.63) * 2.2 * glow(d, vec3(-0.3, -1.0, 0.2), 3.0);
      col += vec3(0.54, 0.44, 0.82) * 2.6 * glow(d, vec3(0.5, 0.8, -0.8), 3.0);
      col += vec3(1.0, 0.97, 0.88) * 9.0 * glow(d, vec3(-0.35, 0.8, 0.9), 60.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
