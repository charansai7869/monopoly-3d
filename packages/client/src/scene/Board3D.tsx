import { Text } from '@react-three/drei';
import { BOARD, GROUP_COLOR, type SpaceState } from '@monopoly/shared';
import { C, D, HALF, T, TILE_TOP, tilePose } from './layout.js';
import { Model } from './Model.js';
import { HOTEL_MODEL, HOUSE_MODEL } from './assets.js';

const BASE_COLOR = '#e9e6d2';
const CORNER_COLOR = '#d9d4ba';
const FELT = '#0c5a36';

interface Props {
  board: SpaceState[];
  ownerColor: (ownerId: string | null) => string | null;
  onPick?: (idx: number) => void;
}

export function Board3D({ board, ownerColor, onPick }: Props) {
  return (
    <group>
      {/* felt base */}
      <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color={FELT} />
      </mesh>
      {/* raised inner panel (the city sits on top of this — see Scenery) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[(HALF - D) * 2, (HALF - D) * 2]} />
        <meshStandardMaterial color="#2f7d3f" />
      </mesh>

      {BOARD.map((def, i) => {
        const pose = tilePose(i);
        const sp = board[i];
        const size = pose.corner ? C : T;
        const owner = ownerColor(sp.ownerId);
        return (
          <group key={i} position={[pose.x, 0, pose.z]} rotation={[0, pose.rotY, 0]}
            onClick={onPick ? (e) => { e.stopPropagation(); onPick(i); } : undefined}>
            {/* tile body */}
            <mesh position={[0, TILE_TOP / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[size, TILE_TOP, D]} />
              <meshStandardMaterial color={pose.corner ? CORNER_COLOR : BASE_COLOR} />
            </mesh>

            {/* colour band for streets, on the inner edge (local -Z) */}
            {def.kind === 'street' && def.group && (
              <mesh position={[0, TILE_TOP + 0.011, -D / 2 + 0.35]}>
                <boxGeometry args={[size, 0.02, 0.7]} />
                <meshStandardMaterial color={GROUP_COLOR[def.group]} />
              </mesh>
            )}

            {/* ownership marker: thin strip on the outer edge in owner colour */}
            {owner && (
              <mesh position={[0, TILE_TOP + 0.011, D / 2 - 0.12]}>
                <boxGeometry args={[size * 0.92, 0.02, 0.18]} />
                <meshStandardMaterial color={owner} opacity={sp.mortgaged ? 0.35 : 1} transparent={sp.mortgaged} />
              </mesh>
            )}

            {/* 3D houses / hotel along the inner edge */}
            {sp.houses > 0 && (
              <group position={[0, TILE_TOP, -D / 2 + 0.4]}>
                {sp.houses === 5 ? <Hotel /> : (
                  Array.from({ length: sp.houses }).map((_, h) => (
                    <group key={h} position={[(h - (sp.houses - 1) / 2) * 0.34, 0, 0]}>
                      <House />
                    </group>
                  ))
                )}
              </group>
            )}

            {/* label — reads along the tile depth so long names fit */}
            <Text
              position={[0, TILE_TOP + 0.012, 0.15]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              fontSize={pose.corner ? 0.28 : 0.26}
              maxWidth={D * 0.85}
              color="#1a1a1a" anchorX="center" anchorY="middle" textAlign="center"
              lineHeight={1}
            >
              {def.name.toUpperCase()}
            </Text>

            {/* price */}
            {def.price != null && (
              <Text position={[0, TILE_TOP + 0.012, D / 2 - 0.45]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                fontSize={0.22} color="#2a6b46" anchorX="center" anchorY="middle">
                {`$${def.price}`}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}

// House: Kenney suburban model if present, else a primitive house.
function House() {
  return (
    <Model url={HOUSE_MODEL} normalize={0.6} fallback={<HousePrim />} />
  );
}
function HousePrim() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.26, 0.26, 0.26]} />
        <meshStandardMaterial color="#2bb24c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.22, 0.18, 4]} />
        <meshStandardMaterial color="#16702f" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Hotel: a larger Kenney commercial building if present, else a primitive hotel.
function Hotel() {
  return (
    <Model url={HOTEL_MODEL} normalize={0.85} fallback={<HotelPrim />} />
  );
}
function HotelPrim() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.66, 0.44, 0.34]} />
        <meshStandardMaterial color="#d0342c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.5, 0.2, 4]} />
        <meshStandardMaterial color="#8f1f18" roughness={0.6} />
      </mesh>
    </group>
  );
}
