import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { sunLightPosition } from './lighting';
import { MoonMesh } from './meshes';

/**
 * 02 장면 1 · 01 티저용 미니 3D — 광원 켜기/끄기와 달 회전만 있는 최소 조작.
 * 전체 모형과 같은 MoonMesh·광원 방향(sunLightPosition)을 재사용한다(R5).
 */
export function MiniMoon({ lightOn, lowGraphics, height = 260 }: { lightOn: boolean; lowGraphics?: boolean; height?: number }) {
  return (
    <div className="lab__view" style={{ minHeight: height, height }}>
      <Canvas frameloop="demand" dpr={lowGraphics ? 1 : [1, 1.5]} camera={{ fov: 35, position: [0, 1.2, 4.2] }} gl={{ antialias: !lowGraphics, powerPreference: 'low-power' }} style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={lightOn ? 0.08 : 0.35} />
        {lightOn ? <directionalLight position={sunLightPosition(20)} intensity={2.6} /> : null}
        {lightOn ? (
          <mesh position={sunLightPosition(9)}>
            <sphereGeometry args={[0.5, 24, 16]} />
            <meshBasicMaterial color="#ffd866" />
          </mesh>
        ) : null}
        <MoonMesh radius={1} />
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
      <div className="lab__badge">
        <span className="chip chip--on-dark">학습 모형</span>
        <span className="chip chip--on-dark">{lightOn ? '광원 켜짐 (오른쪽)' : '광원 꺼짐'}</span>
      </div>
    </div>
  );
}
