<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';

  export let className = '';
</script>

<div class={`h-[420px] w-full overflow-hidden rounded-lg bg-[#eef6f4] ${className}`}>
  <Canvas>
    <T.PerspectiveCamera makeDefault position={[0, 1.6, 5]} />
    <T.AmbientLight intensity={0.65} />
    <T.DirectionalLight position={[3, 4, 3]} intensity={1.25} />

    <T.Mesh rotation={[0.3, 0.65, 0]}>
      <T.IcosahedronGeometry args={[1.45, 1]} />
      <T.MeshStandardMaterial color="#247cff" roughness={0.52} metalness={0.08} />
    </T.Mesh>

    <OrbitControls enablePan={false} enableZoom={false} />
  </Canvas>
</div>
