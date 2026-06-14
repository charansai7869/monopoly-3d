import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  focusRef: React.MutableRefObject<THREE.Vector3>;
  currentId: string | undefined;
}

// Free-orbit camera (drag to rotate, scroll to zoom) that, on each turn change,
// briefly glides its look-at target to the active player's token, then hands
// control straight back to the user.
const CENTER = new THREE.Vector3(0, 0, 0);

export function CameraRig({ focusRef, currentId }: Props) {
  const controls = useRef<any>(null);
  const followUntil = useRef(0);

  useEffect(() => {
    // Start a short follow window whenever the active player changes.
    followUntil.current = performance.now() + 1100;
  }, [currentId]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    // During the follow window glide toward the active token; otherwise always
    // ease back to the board centre so the board stays centred at rest.
    const desired = performance.now() < followUntil.current ? focusRef.current : CENTER;
    if (c.target.distanceToSquared(desired) > 1e-4) {
      c.target.lerp(desired, 0.06);
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}            // orbit around the board centre, never pan away
      enableDamping
      dampingFactor={0.1}
      minDistance={8}
      maxDistance={34}
      maxPolarAngle={Math.PI / 2.15}  // keep camera above the board
      target={[0, 0, 0]}
    />
  );
}
