import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SIZE = 0.85;
const H = SIZE / 2;
const PIP = 0.075;
const O = SIZE * 0.26; // pip offset from centre
const SPIN_MS = 700;

// Pip layout (x,z) on the top (+Y) face for each value 1..6.
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-O, -O], [O, O]],
  3: [[-O, -O], [0, 0], [O, O]],
  4: [[-O, -O], [O, -O], [-O, O], [O, O]],
  5: [[-O, -O], [O, -O], [0, 0], [-O, O], [O, O]],
  6: [[-O, -O], [O, -O], [-O, 0], [O, 0], [-O, O], [O, O]],
};

function Die({ value, position }: { value: number; position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef(0);
  const axis = useRef(new THREE.Vector3(1, 0, 0));

  useEffect(() => {
    start.current = performance.now();
    axis.current.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  }, [value]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = performance.now() - start.current;
    if (t < SPIN_MS) {
      g.rotateOnAxis(axis.current, 0.4); // fast tumble
    } else {
      // settle to flat (identity) so the +Y face with the pips shows up
      g.quaternion.slerp(new THREE.Quaternion(), 0.2);
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>
      {(PIPS[value] ?? []).map(([x, z], i) => (
        <mesh key={i} position={[x, H + 0.01, z]}>
          <cylinderGeometry args={[PIP, PIP, 0.02, 16]} />
          <meshStandardMaterial color="#161616" />
        </mesh>
      ))}
    </group>
  );
}

export function Dice({ dice }: { dice: [number, number] | null }) {
  if (!dice) return null;
  // Float above the central city skyline so the faces stay readable.
  return (
    <group position={[0, 2.4, 0]}>
      <Die value={dice[0]} position={[-0.7, 0, 0]} />
      <Die value={dice[1]} position={[0.7, 0, 0]} />
    </group>
  );
}
