import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Player } from '@monopoly/shared';
import { ringPosition, tileCenter, TILE_TOP, tokenOffset } from './layout.js';
import { PieceMesh } from './Pieces.js';
import { Model } from './Model.js';
import { TOKEN_MODELS } from './assets.js';

const SPEED = 4.5;      // tiles per second while moving (slower = ~2× travel time)
const SIZE = 1.2;       // token scale (20% larger)
const JAIL_IDX = 10;

interface Anim { display: number; target: number; lastPos: number; }

interface Props {
  players: Player[];
  currentId: string | undefined;
  /** updated each frame with the active player's world position (for the camera) */
  focusRef: React.MutableRefObject<THREE.Vector3>;
}

export function Tokens({ players, currentId, focusRef }: Props) {
  const anims = useRef<Map<string, Anim>>(new Map());
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());

  useFrame((_, dt) => {
    players.forEach((p, slot) => {
      let a = anims.current.get(p.id);
      if (!a) { a = { display: p.pos, target: p.pos, lastPos: p.pos }; anims.current.set(p.id, a); }

      // Detect a position change and choose a sensible animation direction.
      if (a.lastPos !== p.pos) {
        const fwd = (p.pos - (a.display % 40) + 40) % 40;
        if (fwd <= 12) a.target = a.display + fwd;            // normal forward roll
        else if (40 - fwd <= 4) a.target = a.display - (40 - fwd); // small "go back N"
        else a.target = Math.floor(a.display / 40) * 40 + p.pos;   // teleport → snap-ish
        a.lastPos = p.pos;
      }

      // Ease display toward target.
      if (a.display !== a.target) {
        const dir = Math.sign(a.target - a.display);
        const step = SPEED * dt;
        if (Math.abs(a.target - a.display) <= step) a.display = a.target;
        else a.display += dir * step;
      }

      const [bx, bz] = ringPosition(a.display);
      const [ox, oz] = tokenOffset(slot);
      const moving = a.display !== a.target;
      const hop = moving ? Math.abs(Math.sin(a.display * Math.PI)) * 0.35 : 0;

      const g = groupRefs.current.get(p.id);
      if (g) g.position.set(bx + ox, TILE_TOP + 0.05 + hop, bz + oz);

      if (p.id === currentId) focusRef.current.set(bx + ox, TILE_TOP, bz + oz);
    });
  });

  return (
    <>
      {players.map((p) => (
        <group key={p.id} ref={(el) => { if (el) groupRefs.current.set(p.id, el); }}
          visible={!p.bankrupt}>
          {/* highlight ring under the active player's token */}
          {p.id === currentId && (
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.42, 0.06, 12, 32]} />
              <meshStandardMaterial color="#ffe14d" emissive="#ffe14d" emissiveIntensity={0.6} />
            </mesh>
          )}
          {/* Real model if its .glb is present, else the primitive piece. */}
          {TOKEN_MODELS[p.piece] ? (
            <Model url={TOKEN_MODELS[p.piece]!} normalize={0.55} position={[0, 0.05, 0]}
              fallback={<PieceMesh piece={p.piece} color={p.color} />} />
          ) : (
            <PieceMesh piece={p.piece} color={p.color} />
          )}
        </group>
      ))}
    </>
  );
}
