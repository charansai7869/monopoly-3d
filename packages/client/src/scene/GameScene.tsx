import { Suspense, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameState } from '@monopoly/shared';
import { Board3D } from './Board3D.js';
import { Tokens } from './Tokens.js';
import { Dice } from './Dice.js';
import { CameraRig } from './CameraRig.js';
import { Scenery } from './Scenery.js';

export function GameScene({ state, onPickTile }: { state: GameState; onPickTile?: (idx: number) => void }) {
  const focusRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentId = state.players[state.current]?.id;

  const colorOf = useMemo(() => {
    const map = new Map(state.players.map((p) => [p.id, p.color] as const));
    return (ownerId: string | null) => (ownerId ? map.get(ownerId) ?? null : null);
  }, [state.players]);

  return (
    <Canvas shadows camera={{ position: [0, 19, 19], fov: 42 }}
      style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#0d2818']} />
      <fog attach="fog" args={['#0d2818', 28, 60]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 8]} intensity={1.1} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-16} shadow-camera-right={16}
        shadow-camera-top={16} shadow-camera-bottom={-16} />

      <Suspense fallback={null}>
        <Scenery />
        <Board3D board={state.board} ownerColor={colorOf} onPick={onPickTile} />
        <Tokens players={state.players} currentId={currentId} focusRef={focusRef} />
        <Dice dice={state.dice} />
      </Suspense>

      <CameraRig focusRef={focusRef} currentId={currentId} />
    </Canvas>
  );
}
