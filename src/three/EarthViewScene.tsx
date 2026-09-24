import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { moonDirection, judgeLunarEclipse, type OrbitParams } from '@shared/eclipseMath';
import type { ModelMode, ModelState } from '@shared/types';
import { TELESCOPE, sunLightPosition } from './lighting';
import { MoonMesh } from './meshes';

/**
 * 지구 시점 — 관측자(지구 중심, 단순화)가 달을 바라보는 망원경 시야.
 * 카메라는 원점에 있고 지구 메시는 이 장면에 없다(지구가 달을 가리는 버그 방지).
 * 우주 시점 카메라를 돌려도 이 화면은 바뀌지 않는다: 이 장면의 카메라는 오직 달 방향만 본다.
 * 각크기는 실제 평균값을 쓰므로 일식 때 달이 태양 원반을 가리는 모습이 나온다.
 */
function LookAtMoon({ dir }: { dir: [number, number, number] }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(dir[0], dir[1], dir[2]);
    camera.updateProjectionMatrix();
    invalidate();
  }, [dir[0], dir[1], dir[2], camera, invalidate]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function EarthViewScene({ mode, state, lowGraphics }: { mode: ModelMode; state: ModelState; lowGraphics?: boolean }) {
  const params: OrbitParams = { theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude };
  const dir = moonDirection(params);
  const moonPos: [number, number, number] = [dir[0] * TELESCOPE.moonDistance, dir[1] * TELESCOPE.moonDistance, dir[2] * TELESCOPE.moonDistance];
  const lunar = mode === 'phase' ? null : judgeLunarEclipse(params);
  const moonDark = lunar ? (lunar.kind === 'total' ? 0.85 : lunar.kind === 'partial' ? 0.5 : lunar.kind === 'penumbral' ? 0.15 : 0) : 0;
  const showSun = mode === 'eclipse-solar' || mode === 'tilt' || mode === 'sandbox';
  return (
    <Canvas frameloop="demand" dpr={lowGraphics ? 1 : [1, 1.5]} camera={{ fov: TELESCOPE.fov, near: 0.5, far: TELESCOPE.sunDistance * 3, position: [0, 0, 0] }} gl={{ antialias: !lowGraphics, powerPreference: 'low-power' }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.09} />
      <directionalLight position={sunLightPosition(TELESCOPE.sunDistance * 2)} intensity={2.6} />
      {showSun ? (
        <mesh position={sunLightPosition(TELESCOPE.sunDistance)}>
          <sphereGeometry args={[TELESCOPE.sunRadius, 32, 16]} />
          <meshBasicMaterial color="#fff3b0" />
        </mesh>
      ) : null}
      <MoonMesh radius={TELESCOPE.moonRadius} position={moonPos} dark={moonDark} />
      <LookAtMoon dir={dir} />
    </Canvas>
  );
}
