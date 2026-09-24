import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DEG, normalizeDeg } from '@shared/phaseMath';
import { moonDirection, judgeLunarEclipse, judgeSolarEclipse, type OrbitParams } from '@shared/eclipseMath';
import type { ModelMode, ModelState } from '@shared/types';
import { DISPLAY, sunLightPosition } from './lighting';
import { EarthMesh, MoonMesh } from './meshes';
import { LabelLayer, LabelProjector, useLabelRefs, type LabelRefs, type LabelSpec } from './labels';

export interface SpaceSceneProps {
  mode: ModelMode;
  state: ModelState;
  onTheta: (t: number) => void;
  dragEnabled?: boolean;
  lowGraphics?: boolean;
  showEcliptic?: boolean;
  showNodeLine?: boolean;
  showOrbit?: boolean;
  /** 1~8번 자리 표시 */
  showMarks?: boolean;
  /** 보는 자리를 마우스로 마음대로 돌릴 수 있는가 — 자유 실험에서만 true */
  freeCamera?: boolean;
  onReady?: () => void;
}

function scaleFor(mode: ModelMode) {
  return mode === 'phase' || mode === 'sandbox' ? DISPLAY.phase : DISPLAY.eclipse;
}

/** 정해진 보는 자리 3가지. 태양이 화면 안에 들어오도록 조금 오른쪽을 바라본다. */
export function cameraPreset(view: ModelState['view'], R: number): { pos: [number, number, number]; target: [number, number, number] } {
  if (view === 'top') return { pos: [0.2 * R, 3.2 * R, 0.001], target: [0.2 * R, 0, 0] };
  if (view === 'side') return { pos: [0.3 * R, 0.12 * R, 3 * R], target: [0.3 * R, 0, 0] };
  return { pos: [0.4 * R, 1.5 * R, 2.1 * R], target: [0.4 * R, 0, 0] };
}

function CameraPreset({ view, radius }: { view: ModelState['view']; radius: number }) {
  const { camera, invalidate } = useThree();
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    const { pos: base, target } = cameraPreset(view, radius);
    // 화면이 좁으면(세로로 길면) 뒤로 물러서서 달이 도는 길 전체와 태양이 다 보이게 한다
    const k = Math.max(1, 1.7 / aspect);
    const pos: [number, number, number] = [target[0] + (base[0] - target[0]) * k, target[1] + (base[1] - target[1]) * k, target[2] + (base[2] - target[2]) * k];
    camera.position.set(...pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    controls?.target.set(...target);
    controls?.update();
    invalidate();
  }, [view, radius, camera, controls, invalidate, aspect]);
  return null;
}

/** 장면의 위치들 — 3D 그림과 이름표가 같은 값을 쓴다 */
function geometry(props: Pick<SpaceSceneProps, 'mode' | 'state'>) {
  const S = scaleFor(props.mode);
  const R = S.orbitRadius;
  const { state } = props;
  const dir = moonDirection({ theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude });
  const moonPos: [number, number, number] = [dir[0] * R, dir[1] * R, dir[2] * R];
  const meLen = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const mePos: [number, number, number] = [(dir[0] / meLen) * S.earthRadius * 1.06, (dir[1] / meLen) * S.earthRadius * 1.06, (dir[2] / meLen) * S.earthRadius * 1.06];
  const observer = state.observer;
  const obsPos: [number, number, number] | null = observer
    ? [
        S.earthRadius * 1.03 * Math.cos(observer.lat * DEG) * Math.cos(observer.lon * DEG),
        S.earthRadius * 1.03 * Math.sin(observer.lat * DEG),
        -S.earthRadius * 1.03 * Math.cos(observer.lat * DEG) * Math.sin(observer.lon * DEG),
      ]
    : null;
  const nodeDir: [number, number, number] = [Math.cos(state.nodeLongitude * DEG), 0, -Math.sin(state.nodeLongitude * DEG)];
  const tagUp = props.mode === 'phase' || props.mode === 'sandbox' ? 1.1 : 2.4;
  return { S, R, moonPos, mePos, obsPos, nodeDir, sunDist: R * 1.45, sunR: R * 0.16, tagUp };
}

function sceneLabels(props: SpaceSceneProps): LabelSpec[] {
  const { S, R, moonPos, mePos, obsPos, nodeDir, sunDist, sunR, tagUp } = geometry(props);
  const { state, dragEnabled = true, showMarks = false, showNodeLine } = props;
  const out: LabelSpec[] = [
    { key: 'sun', pos: [sunDist, sunR + tagUp, 0], text: '태양', tone: 'sun' },
    { key: 'earth', pos: [0, -S.earthRadius - tagUp * 0.8, 0], text: '지구' },
    { key: 'moon', pos: [moonPos[0], moonPos[1] + S.moonRadius + tagUp * 0.9, moonPos[2]], text: dragEnabled ? '달 · 끌어서 옮기기' : '달' },
  ];
  if (obsPos) out.push({ key: 'obs', pos: [obsPos[0] * 1.6, obsPos[1] * 1.6 + 0.6, obsPos[2] * 1.6], text: '보는 곳', tone: 'me' });
  else out.push({ key: 'me', pos: [mePos[0] * 1.9, mePos[1] * 1.9 + 0.5, mePos[2] * 1.9], text: '나', tone: 'me' });
  if (showMarks) {
    for (let i = 0; i < 8; i++) {
      const d = moonDirection({ theta: i * 45, inclination: state.inclination, nodeLongitude: state.nodeLongitude });
      out.push({ key: `m${i}`, pos: [d[0] * R * 1.14, d[1] * R * 1.14, d[2] * R * 1.14], text: String(i + 1), tone: 'mark' });
    }
  }
  if (showNodeLine) out.push({ key: 'node', pos: [nodeDir[0] * R * 1.2, 0.6, nodeDir[2] * R * 1.2], text: '주황색 선: 두 길이 만나는 곳' });
  return out;
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

/** 지구 그림자(월식) — 진한 그림자와 옅은 그림자 */
function EarthShadow({ orbitRadius, earthRadius }: { orbitRadius: number; earthRadius: number }) {
  const len = orbitRadius * 1.25;
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

/** 달 그림자(일식) */
function MoonShadow({ moonPos, orbitRadius, moonRadius }: { moonPos: [number, number, number]; orbitRadius: number; moonRadius: number }) {
  const len = orbitRadius * 0.97;
  const penEnd = moonRadius * 2.1;
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

function SceneContent(props: SpaceSceneProps & { labels: LabelSpec[]; labelRefs: LabelRefs }) {
  const { mode, state, onTheta, dragEnabled = true, showEcliptic, showNodeLine, showOrbit = true, freeCamera = false } = props;
  const { S, R, moonPos, mePos, obsPos, nodeDir, sunDist, sunR } = geometry(props);
  const params: OrbitParams = { theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude };
  const [dragging, setDragging] = useState(false);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    if (controls) controls.enabled = freeCamera && !dragging;
  }, [dragging, controls, freeCamera]);

  const lunar = mode === 'eclipse-lunar' || mode === 'tilt' || mode === 'sandbox' ? judgeLunarEclipse(params) : null;
  const solar = mode === 'eclipse-solar' || mode === 'tilt' || mode === 'sandbox' ? judgeSolarEclipse(params) : null;
  const moonDark = lunar ? (lunar.kind === 'total' ? 0.85 : lunar.kind === 'partial' ? 0.5 : lunar.kind === 'penumbral' ? 0.15 : 0) : 0;

  function thetaFromEvent(e: ThreeEvent<PointerEvent>) {
    const p = e.point;
    return normalizeDeg(Math.atan2(-p.z, p.x) / DEG);
  }

  return (
    <>
      <ambientLight intensity={0.07} />
      <directionalLight position={sunLightPosition(R * 6)} intensity={2.6} />
      {/* 태양 */}
      <mesh position={sunLightPosition(sunDist)}>
        <sphereGeometry args={[sunR, 24, 16]} />
        <meshBasicMaterial color="#ffd866" />
      </mesh>
      {[0.4, 0, -0.4].map((f) => (
        <Line key={f} points={[[sunDist - sunR, 0, f * R], [R * 1.12, 0, f * R]]} color="#ffd866" lineWidth={1} dashed dashSize={0.5} gapSize={0.35} transparent opacity={0.55} />
      ))}
      <EarthMesh radius={S.earthRadius} />
      <mesh position={obsPos ?? mePos}>
        <sphereGeometry args={[S.earthRadius * (obsPos ? 0.08 : 0.09), 12, 8]} />
        <meshBasicMaterial color="#ff7759" />
      </mesh>
      {showEcliptic ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[R * 1.12, 64]} />
          <meshBasicMaterial color="#6fb1e6" transparent opacity={0.08} side={2} depthWrite={false} />
        </mesh>
      ) : null}
      {showOrbit ? <OrbitRing params={{ inclination: state.inclination, nodeLongitude: state.nodeLongitude }} radius={R} /> : null}
      {showNodeLine ? <Line points={[[-nodeDir[0] * R * 1.1, 0, -nodeDir[2] * R * 1.1], [nodeDir[0] * R * 1.1, 0, nodeDir[2] * R * 1.1]]} color="#ffad9b" lineWidth={2} /> : null}
      {state.showShadow && (mode === 'eclipse-lunar' || mode === 'tilt' || mode === 'sandbox') ? <EarthShadow orbitRadius={R} earthRadius={S.earthRadius} /> : null}
      {state.showShadow && (mode === 'eclipse-solar' || mode === 'tilt' || mode === 'sandbox') && solar?.betweenSunAndEarth ? <MoonShadow moonPos={moonPos} orbitRadius={R} moonRadius={S.moonRadius} /> : null}
      {state.showSightline ? <Line points={[obsPos ?? mePos, moonPos]} color="#8ff0c8" lineWidth={1.4} dashed dashSize={0.3} gapSize={0.2} /> : null}
      <MoonMesh radius={S.moonRadius} position={moonPos} dark={moonDark} />
      {state.showLitSide ? (
        <mesh position={moonPos}>
          <sphereGeometry args={[S.moonRadius * 1.12, 32, 16, Math.PI / 2, Math.PI]} />
          <meshBasicMaterial color="#ffe28a" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ) : null}
      {dragEnabled ? (
        <mesh
          position={moonPos}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDragging(true);
          }}
          onPointerUp={() => setDragging(false)}
        >
          <sphereGeometry args={[S.moonRadius * 2.4, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={dragging ? 0.25 : 0.12} depthWrite={false} />
        </mesh>
      ) : null}
      {/* 달을 끌 때 쓰는 보이지 않는 판 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (dragging) onTheta(thetaFromEvent(e));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <planeGeometry args={[R * 8, R * 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <CameraPreset view={state.view} radius={R} />
      <OrbitControls makeDefault enablePan={false} enableRotate={freeCamera} enableZoom={freeCamera} minDistance={R * 0.6} maxDistance={R * 4} />
      <LabelProjector labels={props.labels} refs={props.labelRefs} />
    </>
  );
}

export function SpaceScene(props: SpaceSceneProps) {
  const S = scaleFor(props.mode);
  const { pos } = cameraPreset('default', S.orbitRadius);
  const labelRefs = useLabelRefs();
  const labels = sceneLabels(props);
  return (
    <>
      <Canvas
        frameloop="demand"
        dpr={props.lowGraphics ? 1 : [1, 1.5]}
        camera={{ fov: 40, near: 0.1, far: S.orbitRadius * 20, position: pos }}
        gl={{ antialias: !props.lowGraphics, powerPreference: 'low-power' }}
        onCreated={() => props.onReady?.()}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent {...props} labels={labels} labelRefs={labelRefs} />
      </Canvas>
      <LabelLayer labels={labels} refs={labelRefs} />
    </>
  );
}
