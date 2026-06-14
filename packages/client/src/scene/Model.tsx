import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

// Loads a GLB and renders it. If the file is missing/unloadable, an error
// boundary swaps in the `fallback` (a primitive), so the build never breaks
// and the scene upgrades automatically once real assets are dropped in.

type GroupProps = ThreeElements['group'];

class ModelBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* swallow — fallback is shown */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Gltf({ url, normalize, ...props }: { url: string; normalize?: number } & GroupProps) {
  const { scene } = useGLTF(url);
  // Clone so one loaded model can be placed many times independently. If
  // `normalize` is set, scale the model so its largest dimension equals that
  // value and drop it so its base sits at y=0 and it's centred on x/z — this
  // makes models from different packs render at a consistent size + position.
  const obj = React.useMemo(() => {
    const o = scene.clone(true);
    if (normalize) {
      const box = new THREE.Box3().setFromObject(o);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = normalize / maxDim;
      o.scale.setScalar(s);
      // Recompute after scaling to ground + centre it.
      const box2 = new THREE.Box3().setFromObject(o);
      o.position.x -= center.x * s;
      o.position.z -= center.z * s;
      o.position.y -= box2.min.y;
    }
    return o;
  }, [scene, normalize]);
  return (
    <group {...(props as object)}>
      <primitive object={obj} />
    </group>
  );
}

export function Model({ url, fallback = null, normalize, ...props }: {
  url: string; fallback?: React.ReactNode; normalize?: number;
} & GroupProps) {
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Gltf url={url} normalize={normalize} {...props} />
      </Suspense>
    </ModelBoundary>
  );
}
