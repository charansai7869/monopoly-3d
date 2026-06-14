import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HALF, tilePose } from './layout.js';
import { Model } from './Model.js';
import { COMMERCIAL_BUILDINGS, ROAD_TILE, TREE_MODELS } from './assets.js';

// "Board comes to life" surroundings: grass, trees, a river, a ferris-wheel
// exhibition, a central city skyline, and a jail cell on the Jail corner.
// All from primitives — no imported models.

function TreePrim() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}><cylinderGeometry args={[0.12, 0.16, 0.8, 8]} /><meshStandardMaterial color="#6b4423" /></mesh>
      <mesh castShadow position={[0, 1.05, 0]}><coneGeometry args={[0.6, 1.1, 9]} /><meshStandardMaterial color="#2f9e44" /></mesh>
      <mesh castShadow position={[0, 1.55, 0]}><coneGeometry args={[0.42, 0.8, 9]} /><meshStandardMaterial color="#37b24d" /></mesh>
    </group>
  );
}

function Tree({ x, z, s = 1, model }: { x: number; z: number; s?: number; model: string }) {
  return (
    <group position={[x, 0, z]}>
      <Model url={model} normalize={2.4 * s} fallback={<group scale={s}><TreePrim /></group>} />
    </group>
  );
}

function FerrisWheel({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * 0.25; });
  const cabins = 12;
  return (
    <group position={[x, 0, z]}>
      {/* legs */}
      <mesh castShadow position={[-1, 1.6, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.08, 0.08, 3.6, 8]} /><meshStandardMaterial color="#888" /></mesh>
      <mesh castShadow position={[1, 1.6, 0]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.08, 0.08, 3.6, 8]} /><meshStandardMaterial color="#888" /></mesh>
      <group ref={ref} position={[0, 3.2, 0]}>
        <mesh><torusGeometry args={[1.6, 0.06, 8, 32]} /><meshStandardMaterial color="#e64980" emissive="#e64980" emissiveIntensity={0.3} /></mesh>
        {Array.from({ length: cabins }).map((_, i) => {
          const a = (i / cabins) * Math.PI * 2;
          const cx = Math.cos(a) * 1.6, cy = Math.sin(a) * 1.6;
          const hue = `hsl(${(i * 360) / cabins}, 70%, 55%)`;
          return (
            <group key={i}>
              <mesh position={[cx, cy, 0]} rotation={[0, 0, -a]}><boxGeometry args={[0.04, 1.6, 0.04]} /><meshStandardMaterial color="#aaa" /></mesh>
              <mesh position={[cx, cy, 0]}><boxGeometry args={[0.28, 0.24, 0.24]} /><meshStandardMaterial color={hue} /></mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

// Primitive fallback building (used until the real Kenney .glb is present).
function FallbackBuilding({ h, c }: { h: number; c: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[0.85, h, 0.85]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[0, h / 2, 0.426]}>
        <planeGeometry args={[0.6, h * 0.8]} />
        <meshStandardMaterial color="#ffe08a" emissive="#ffd45e" emissiveIntensity={0.5} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function CitySkyline() {
  // City blocks on a grid with roads between them. Each block tries to load a
  // real Kenney commercial building; if the .glb isn't present yet it falls
  // back to a primitive box, so the scene always renders.
  const palette = ['#7d93b2', '#9aa7b8', '#b08968', '#8d99ae', '#a7c4bc', '#c9ada7'];
  const blocks = useMemo(() => {
    const out: { x: number; z: number; rot: number; model: string; h: number; c: string; scale: number }[] = [];
    let seed = 1234;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const STEP = 1.7;
    for (let gx = -4.2; gx <= 4.2; gx += STEP) {
      for (let gz = -4.2; gz <= 4.2; gz += STEP) {
        if (Math.abs(gx) < 1.3 && Math.abs(gz) < 1.3) continue; // central plaza for dice
        out.push({
          x: gx, z: gz,
          rot: ((rnd() * 4) | 0) * (Math.PI / 2),
          model: COMMERCIAL_BUILDINGS[(rnd() * COMMERCIAL_BUILDINGS.length) | 0],
          h: 0.5 + rnd() * 1.5,
          c: palette[(rnd() * palette.length) | 0],
          scale: 0.7 + rnd() * 0.5,
        });
      }
    }
    return out;
  }, []);

  return (
    <group position={[0, 0.1, 0]}>
      {/* road grid laid under the blocks (real tile if present, else dark strips) */}
      {[-2.55, -0.85, 0.85, 2.55].map((c) => (
        <group key={`rows${c}`}>
          <mesh position={[0, 0.015, c]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[9, 0.5]} /><meshStandardMaterial color="#52555c" />
          </mesh>
          <mesh position={[c, 0.015, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[9, 0.5]} /><meshStandardMaterial color="#52555c" />
          </mesh>
        </group>
      ))}
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {/* normalize = target max-dimension; b.scale adds skyline height variety */}
          <Model url={b.model} normalize={1.5 * b.scale} fallback={<FallbackBuilding h={b.h} c={b.c} />} />
        </group>
      ))}
      {/* hint that a road model exists in the manifest (kept for wiring parity) */}
      {ROAD_TILE && null}
    </group>
  );
}

function JailCell() {
  // A proper hollow 3D cell on the Jail corner: floor, three solid low walls,
  // a barred front, and a roof — so a jailed token visibly sits "inside".
  const pose = tilePose(10);
  const S = 1.7;          // cell footprint
  const WALL_H = 0.85;
  const wallMat = '#6b6f76';
  const barMat = '#2c2c2c';
  const bars = 6;
  return (
    <group position={[pose.x, 0.2, pose.z]}>
      {/* floor */}
      <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[S, 0.04, S]} /><meshStandardMaterial color="#8a8f96" /></mesh>
      {/* back + two side walls (front is barred) */}
      <mesh position={[0, WALL_H / 2, -S / 2]} castShadow><boxGeometry args={[S, WALL_H, 0.08]} /><meshStandardMaterial color={wallMat} /></mesh>
      <mesh position={[-S / 2, WALL_H / 2, 0]} castShadow><boxGeometry args={[0.08, WALL_H, S]} /><meshStandardMaterial color={wallMat} /></mesh>
      <mesh position={[S / 2, WALL_H / 2, 0]} castShadow><boxGeometry args={[0.08, WALL_H, S]} /><meshStandardMaterial color={wallMat} /></mesh>
      {/* barred front */}
      {Array.from({ length: bars }).map((_, i) => {
        const t = (i / (bars - 1) - 0.5) * (S - 0.15);
        return (
          <mesh key={i} position={[t, WALL_H / 2, S / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, WALL_H, 8]} />
            <meshStandardMaterial color={barMat} metalness={0.6} roughness={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, WALL_H, S / 2]}><boxGeometry args={[S, 0.07, 0.07]} /><meshStandardMaterial color={barMat} metalness={0.6} /></mesh>
      {/* roof */}
      <mesh position={[0, WALL_H + 0.04, 0]} castShadow><boxGeometry args={[S + 0.06, 0.07, S + 0.06]} /><meshStandardMaterial color="#565a60" /></mesh>
    </group>
  );
}

export function Scenery() {
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; model: string }[] = [];
    let seed = 99;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 40; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = HALF + 3 + rnd() * 14;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      if (x > HALF + 2) continue; // keep the river side (+X) clear of trees
      out.push({ x, z, s: 0.7 + rnd() * 0.8, model: TREE_MODELS[(rnd() * TREE_MODELS.length) | 0] });
    }
    return out;
  }, []);

  return (
    <group>
      {/* grass ground far beneath/around the board */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#3f9d4f" />
      </mesh>

      {/* river along the +X side */}
      <mesh position={[HALF + 16, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 120]} />
        <meshStandardMaterial color="#2a78c2" transparent opacity={0.85} metalness={0.3} roughness={0.2} />
      </mesh>

      {trees.map((t, i) => <Tree key={i} x={t.x} z={t.z} s={t.s} model={t.model} />)}
      <FerrisWheel x={-HALF - 8} z={-HALF - 4} />
      <CitySkyline />
      <JailCell />
    </group>
  );
}
