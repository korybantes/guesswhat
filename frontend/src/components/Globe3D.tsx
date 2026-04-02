import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function GlobeWireframe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.15;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.1;
    }
  });

  // Generate random dots on sphere surface (simulating landmass)
  const dotPositions = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const count = 2000;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 1.52;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      // Vary color between cyan and purple
      const t = Math.random();
      colors.push(
        t * 0 + (1 - t) * 0.48,
        t * 0.94 + (1 - t) * 0.23,
        t * 1 + (1 - t) * 0.93
      );
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
  }, []);

  return (
    <group>
      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[1.8, 32, 32]}>
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Main wireframe sphere */}
      <Sphere ref={meshRef} args={[1.5, 24, 24]}>
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.12}
        />
      </Sphere>

      {/* Dots layer */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={dotPositions.positions.length / 3}
            array={dotPositions.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={dotPositions.colors.length / 3}
            array={dotPositions.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>

      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 1.58, 64]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Meridian ring */}
      <mesh>
        <ringGeometry args={[1.55, 1.58, 64]} />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Floating particles around the globe
function Particles() {
  const particlesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < 300; i++) {
      pos.push(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
    }
    return new Float32Array(pos);
  }, []);

  useFrame((_, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.02;
      particlesRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00f0ff"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

interface Globe3DProps {
  className?: string;
}

export default function Globe3D({ className }: Globe3DProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <GlobeWireframe />
        <Particles />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
