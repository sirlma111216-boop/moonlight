import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DEG, normalizeDeg } from '@shared/phaseMath';
import { moonDirection, judgeLunarEclipse, judgeSolarEclipse, type OrbitParams } from '@shared/eclipseMath';
import type { ModelMode, ModelState } from '@shared/types';
import { DISPLAY, sunLightPosition } from './lighting';
import { EarthMesh, MoonMesh } from './meshes';

export interface SpaceSceneProps {
  mode: ModelMode;
  state: ModelState;
  onTheta: (t: number) => void;
  dragEnabled?: boolean;
  lowGraphics?: boolean;
  /** 교사가 켜는 표시 옵션 */
  showEcliptic?: boolean;
  showNodeLine?: boolean;
  showOrbit?: boolean;
  onReady?: () => void;
}

function scaleFor(mode: ModelMode) {
  return mode === 'phase' || mode === 'sandbox' ? DISPLAY.phase : DISPLAY.eclipse;
}

function CameraPreset({ view, radius }: { view: ModelState['view']; radius: number }) {
  const { camera, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    const R = radius;
    if (view === 'top') camera.position.set(0.0001, R * 2.6, 0);
    else if (view === 'side') camera.position.set(0.0001, R * 0.25, R * 2.6);
    else camera.position.set(R * 1.15, R * 0.95, R * 1.5);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls?.target.set(0, 0, 0);
    controls?.update();
    invalidate();
  }, [view, radius, camera, controls, invalidate]);
  return null;
}

function OrbitRing({ params, radius }: { params: Omit<OrbitParams, 'theta'>; radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * 360;
      const d = moonDirection({ ...params, theta: t });
      pts.push([d[0] * radius, d[1] * radius, d[2] * radius]);
    }
    return pts;
  }, [params.inclination, params.nodeLongitude, radius]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Line points={points} color="#9fd8c4" lineWidth={1} dashed dashSize={0.4} gapSize={0.3} transparent opacity={0.7} />;
}

/** 지구 그림자(월식) — 지구 반지름 기준. 길이는 궤도 반지름에 맞춰 표시 */
function EarthShadow({ orbitRadius, earthRadius }: { orbitRadius: number; earthRadius: number }) {
  const len = orbitRadius * 1.25;
  // 본그림자: 지구에서 멀어질수록 가늘어짐(궤도 거리에서 약 0.72 Re — 실제 비율), 반그림자: 넓어짐(약 1.28 Re)
  const umbraEnd = earthRadius * (1 - (len / orbitRadius) * 0.28);
  const penEnd = earthRadius * (1 + (len / orbitRadius) * 0.28);
  return (
    <group position={[-len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[earthRadius, Math.max(0.02, umbraEnd), len, 32, 1, true]} />
        <meshBasicMaterial color="#000" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[earthRadius, penEnd, len, 32, 1, true]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 달 그림자(일식) — 달에서 −X 방향. 본그림자 길이는 달까지 거리의 약 0.97배(평균 거리) */
function MoonShadow({ moonPos, orbitRadius, moonRadius }: { moonPos: [number, number, number]; orbitRadius: number; moonRadius: number }) {
  const len = orbitRadius * 0.97;
  const penEnd = moonRadius * 2.1; // 지구 거리에서 반그림자 ≈ 0.55 Re — 달 표시 반지름 기준 과장
  return (
    <group position={[moonPos[0] - len / 2, moonPos[1], moonPos[2]]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[moonRadius, 0.01, len, 24, 1, true]} />
        <meshBasicMaterial color="#000" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[moonRadius, penEnd, len, 24, 1, true]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SceneContent(props: SpaceSceneProps) {
  const { mode, state, onTheta, dragEnabled = true, showEcliptic, showNodeLine, showOrbit = true } = props;
  const S = scaleFor(mode);
  const params: OrbitParams = { theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude };
  const dir = moonDirection(params);
  const moonPos: [number, number, number] = [dir[0] * S.orbitRadius, dir[1] * S.orbitRadius, dir[2] * S.orbitRadius];
  const [dragging, setDragging] = useState(false);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    if (controls) controls.enabled = !dragging;
  }, [dragging, controls]);

  const lunar = mode === 'eclipse-lunar' || mode === 'tilt' || mode === 'sandbox' ? judgeLunarEclipse(params) : null;
  const solar = mode === 'eclipse-solar' || mode === 'tilt' || mode === 'sandbox' ? judgeSolarEclipse(params) : null;
  const moonDark = lunar ? (lunar.kind === 'total' ? 0.85 : lunar.kind === 'partial' ? 0.5 : lunar.kind === 'penumbral' ? 0.15 : 0) : 0;

  const planeRef = useRef<import('three').Mesh>(null);
  function thetaFromEvent(e: ThreeEvent<PointerEvent>) {
    const p = e.point;
    return normalizeDeg(Math.atan2(-p.z, p.x) / DEG);
  }

  const nodeDir: [number, number, number] = [Math.cos(state.nodeLongitude * DEG), 0, -Math.sin(state.nodeLongitude * DEG)];
  const observer = state.observer;
  const obsPos: [number, number, number] | null = observer
    ? [
        S.earthRadius * 1.03 * Math.cos(observer.lat * DEG) * Math.cos(observer.lon * DEG),
        S.earthRadius * 1.03 * Math.sin(observer.lat * DEG),
        -S.earthRadius * 1.03 * Math.cos(observer.lat * DEG) * Math.sin(observer.lon * DEG),
      ]
    : null;

  return (
    <>
      <ambientLight intensity={0.07} />
      <directionalLight position={sunLightPosition(S.orbitRadius * 6)} intensity={2.6} />
      {/* 태양 방향 표시 */}
      <mesh position={sunLightPosition(S.orbitRadius * 2.2)}>
        <sphereGeometry args={[S.orbitRadius * 0.12, 24, 16]} />
        <meshBasicMaterial color="#ffd866" />
      </mesh>
      {[0.35, 0, -0.35].map((f) => (
        <Line key={f} points={[sunLightPosition(S.orbitRadius * 2.05).map((v, i) => (i === 2 ? v + f * S.orbitRadius : v)) as [number, number, number], [S.orbitRadius * 1.2, 0, f * S.orbitRadius]]} color="#ffd866" lineWidth={1} dashed dashSize={0.5} gapSize={0.35} transparent opacity={0.6} />
      ))}
      <EarthMesh radius={S.earthRadius} />
      {obsPos ? (
        <mesh position={obsPos}>
          <sphereGeometry args={[S.earthRadius * 0.06, 12, 8]} />
          <meshBasicMaterial color="#ff7759" />
        </mesh>
      ) : null}
      {showEcliptic ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[S.orbitRadius * 1.12, 64]} />
          <meshBasicMaterial color="#6fb1e6" transparent opacity={0.08} side={2} depthWrite={false} />
        </mesh>
      ) : null}
      {showOrbit ? <OrbitRing params={{ inclination: state.inclination, nodeLongitude: state.nodeLongitude }} radius={S.orbitRadius} /> : null}
      {showNodeLine ? (
        <Line points={[[-nodeDir[0] * S.orbitRadius * 1.1, 0, -nodeDir[2] * S.orbitRadius * 1.1], [nodeDir[0] * S.orbitRadius * 1.1, 0, nodeDir[2] * S.orbitRadius * 1.1]]} color="#ffad9b" lineWidth={1.5} />
      ) : null}
      {state.showShadow && (mode === 'eclipse-lunar' || mode === 'tilt' || mode === 'sandbox') ? <EarthShadow orbitRadius={S.orbitRadius} earthRadius={S.earthRadius} /> : null}
      {state.showShadow && (mode === 'eclipse-solar' || mode === 'tilt' || mode === 'sandbox') && solar?.betweenSunAndEarth ? <MoonShadow moonPos={moonPos} orbitRadius={S.orbitRadius} moonRadius={S.moonRadius} /> : null}
      {state.showSightline ? <Line points={[[0, 0, 0], moonPos]} color="#8ff0c8" lineWidth={1.2} dashed dashSize={0.3} gapSize={0.2} /> : null}
      <MoonMesh radius={S.moonRadius} position={moonPos} dark={moonDark} />
      {state.showLitSide ? (
        <mesh position={moonPos}>
          <sphereGeometry args={[S.moonRadius * 1.12, 32, 16, Math.PI / 2, Math.PI]} />
          <meshBasicMaterial color="#ffe28a" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ) : null}
      {/* 조작 핸들 */}
      {dragEnabled ? (
        <mesh
          position={moonPos}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDragging(true);
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerUp={() => setDragging(false)}
        >
          <sphereGeometry args={[S.moonRadius * 2.2, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={dragging ? 0.25 : 0.12} depthWrite={false} />
        </mesh>
      ) : null}
      {/* 드래그 평면(황도면) */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (dragging) onTheta(thetaFromEvent(e));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <planeGeometry args={[S.orbitRadius * 8, S.orbitRadius * 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <CameraPreset view={state.view} radius={S.orbitRadius} />
      <OrbitControls makeDefault enablePan={false} minDistance={S.orbitRadius * 0.6} maxDistance={S.orbitRadius * 4} />
    </>
  );
}

export function SpaceScene(props: SpaceSceneProps) {
  const S = scaleFor(props.mode);
  return (
    <Canvas
      frameloop="demand"
      dpr={props.lowGraphics ? 1 : [1, 1.5]}
      camera={{ fov: 40, near: 0.1, far: S.orbitRadius * 20, position: [S.orbitRadius * 1.15, S.orbitRadius * 0.95, S.orbitRadius * 1.5] }}
      gl={{ antialias: !props.lowGraphics, powerPreference: 'low-power' }}
      onCreated={() => props.onReady?.()}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
