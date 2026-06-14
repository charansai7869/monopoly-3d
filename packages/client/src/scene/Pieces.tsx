import type { PieceType } from '@monopoly/shared';

// Low-poly stylised 3D models for each token, built from primitives.
// Each model sits with its base near y=0 and stands ~0.5 tall.
export function PieceMesh({ piece, color }: { piece: PieceType; color: string }) {
  const mat = <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} />;
  switch (piece) {
    case 'car':
      return (
        <group>
          <mesh castShadow position={[0, 0.12, 0]}><boxGeometry args={[0.5, 0.14, 0.26]} />{mat}</mesh>
          <mesh castShadow position={[0.03, 0.24, 0]}><boxGeometry args={[0.26, 0.14, 0.22]} />{mat}</mesh>
          {[[-0.16, 0.13], [0.16, 0.13], [-0.16, -0.13], [0.16, -0.13]].map(([x, z], i) => (
            <mesh key={i} castShadow position={[x, 0.07, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} /><meshStandardMaterial color="#1a1a1a" />
            </mesh>
          ))}
        </group>
      );
    case 'hat':
      return (
        <group>
          <mesh castShadow position={[0, 0.04, 0]}><cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />{mat}</mesh>
          <mesh castShadow position={[0, 0.22, 0]}><cylinderGeometry args={[0.17, 0.17, 0.34, 24]} />{mat}</mesh>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.18, 0.18, 0.05, 24]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      );
    case 'ship':
      return (
        <group>
          <mesh castShadow position={[0, 0.12, 0]} scale={[1, 1, 0.5]}><cylinderGeometry args={[0.12, 0.26, 0.2, 6]} />{mat}</mesh>
          <mesh castShadow position={[0, 0.28, 0]}><boxGeometry args={[0.28, 0.12, 0.14]} />{mat}</mesh>
          <mesh castShadow position={[0.05, 0.42, 0]}><cylinderGeometry args={[0.05, 0.05, 0.18, 12]} /><meshStandardMaterial color="#d33" /></mesh>
        </group>
      );
    case 'dog':
      return (
        <group>
          <mesh castShadow position={[0, 0.18, 0]}><boxGeometry args={[0.4, 0.16, 0.16]} />{mat}</mesh>
          <mesh castShadow position={[0.22, 0.26, 0]}><boxGeometry args={[0.16, 0.16, 0.14]} />{mat}</mesh>
          <mesh castShadow position={[-0.24, 0.26, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.16, 0.06, 0.06]} />{mat}</mesh>
          {[[-0.14, 0.07], [0.14, 0.07], [-0.14, -0.07], [0.14, -0.07]].map(([x, z], i) => (
            <mesh key={i} castShadow position={[x, 0.05, z]}><boxGeometry args={[0.06, 0.12, 0.06]} />{mat}</mesh>
          ))}
        </group>
      );
    case 'cat':
      return (
        <group>
          <mesh castShadow position={[0, 0.16, 0]}><cylinderGeometry args={[0.12, 0.16, 0.24, 16]} />{mat}</mesh>
          <mesh castShadow position={[0, 0.36, 0]}><sphereGeometry args={[0.13, 16, 16]} />{mat}</mesh>
          {[[-0.07], [0.07]].map(([x], i) => (
            <mesh key={i} castShadow position={[x, 0.48, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]}><coneGeometry args={[0.05, 0.12, 8]} />{mat}</mesh>
          ))}
          <mesh castShadow position={[-0.16, 0.22, 0]} rotation={[0, 0, 1]}><cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />{mat}</mesh>
        </group>
      );
    case 'boot':
      return (
        <group>
          <mesh castShadow position={[0, 0.22, 0]}><boxGeometry args={[0.14, 0.4, 0.16]} />{mat}</mesh>
          <mesh castShadow position={[0.12, 0.06, 0]}><boxGeometry args={[0.34, 0.12, 0.16]} />{mat}</mesh>
        </group>
      );
    case 'thimble':
      return (
        <group>
          <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.16, 0.13, 0.4, 20]} />{mat}</mesh>
          <mesh castShadow position={[0, 0.4, 0]}><sphereGeometry args={[0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat}</mesh>
        </group>
      );
    case 'iron':
      return (
        <group>
          <mesh castShadow position={[0, 0.08, 0]} scale={[1.3, 1, 0.7]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.04, 0.26, 0.16, 4]} />{mat}</mesh>
          <mesh castShadow position={[0, 0.3, 0]}><torusGeometry args={[0.14, 0.035, 8, 16, Math.PI]} />{mat}</mesh>
        </group>
      );
    default:
      return <mesh castShadow position={[0, 0.2, 0]}><sphereGeometry args={[0.2, 16, 16]} />{mat}</mesh>;
  }
}
