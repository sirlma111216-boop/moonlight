import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { DEG, normalizeDeg } from '@shared/phaseMath';
import { lampLightPosition } from './lighting';
import { MoonMesh } from './meshes';
import { LabelLayer, LabelProjector, useLabelRefs, type LabelRefs, type LabelSpec } from './labels';

/**
 * 02 장면 1 — '태양 역할 전등'과 달.
 * 보는 자리는 바로 위로 고정한다(돌릴 수 없음). 위에서 내려다보면 밝은 절반이 언제나 다 보이므로,
 * 학생은 '전등 쪽 절반이 밝다'는 한 가지만 보게 된다. 학생이 바꾸는 것은 전등의 자리뿐이다.
 * 달 모양·조명은 05단계 전체 모형과 같은 MoonMesh·광원 규칙(lampLightPosition)을 쓴다.
 */

const MOON_R = 1.2;
const LAMP_DIST = 3.0;
const LAMP_R = 0.38;

function TopCamera() {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, -1);
    camera.position.set(0, 9.5, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate]);
  return null;
}

function miniLabels(lightOn: boolean, lampAngle: number): LabelSpec[] {
  const lamp = lampLightPosition(lampAngle, LAMP_DIST);
  const d: [number, number, number] = [lamp[0] / LAMP_DIST, 0, lamp[2] / LAMP_DIST];
  // 전등 이름표는 전등 바로 아래(화면 아래쪽 = +Z). 전등이 아래쪽에 있으면 위에 둔다.
  const below = lamp[2] < 1.4;
  return [
    { key: 'moon', pos: [-d[0] * (MOON_R + 0.6), 0, -d[2] * (MOON_R + 0.6)], text: '달' },
    { key: 'lamp', pos: [lamp[0], 0, lamp[2] + (below ? 0.75 : -0.75)], text: lightOn ? '전등 (태양 역할) · 켜짐' : '전등 (태양 역할) · 꺼짐', tone: lightOn ? 'sun' : 'dark' },
  ];
}

function Scene({ lightOn, lampAngle, onLampAngle, labels, labelRefs }: { lightOn: boolean; lampAngle: number; onLampAngle: (a: number) => void; labels: LabelSpec[]; labelRefs: LabelRefs }) {
  const [dragging, setDragging] = useState(false);
  const lamp = lampLightPosition(lampAngle, LAMP_DIST);
  const far = lampLightPosition(lampAngle, 30);
  const d: [number, number, number] = [lamp[0] / LAMP_DIST, 0, lamp[2] / LAMP_DIST];
  const p: [number, number, number] = [-d[2], 0, d[0]];
  const rays = [-0.7, 0, 0.7].map((o) => [
    [lamp[0] + p[0] * o * 0.5 - d[0] * LAMP_R, 0.01, lamp[2] + p[2] * o * 0.5 - d[2] * LAMP_R] as [number, number, number],
    [d[0] * MOON_R * 1.1 + p[0] * o, 0.01, d[2] * MOON_R * 1.1 + p[2] * o] as [number, number, number],
  ]);
  const outline = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([Math.cos(a) * MOON_R * 1.02, MOON_R + 0.02, Math.sin(a) * MOON_R * 1.02]);
    }
    return pts;
  }, []);
  function angleFrom(e: ThreeEvent<PointerEvent>) {
    return normalizeDeg(Math.atan2(-e.point.z, e.point.x) / DEG);
  }
  return (
    <>
      <ambientLight intensity={lightOn ? 0.05 : 0.02} />
      {lightOn ? <directionalLight position={far} intensity={2.8} /> : null}
      <MoonMesh radius={MOON_R} />
      {!lightOn ? <Line points={outline} color="#9aa0a6" lineWidth={1} dashed dashSize={0.15} gapSize={0.12} /> : null}
      <mesh
        position={lamp}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
        }}
      >
        <sphereGeometry args={[LAMP_R, 24, 16]} />
        <meshBasicMaterial color={lightOn ? '#ffd866' : '#6b6b55'} />
      </mesh>
      {lightOn ? rays.map((r, i) => <Line key={i} points={r} color="#ffd866" lineWidth={1.2} dashed dashSize={0.18} gapSize={0.12} transparent opacity={0.8} />) : null}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (dragging) onLampAngle(angleFrom(e));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <TopCamera />
      <LabelProjector labels={labels} refs={labelRefs} />
    </>
  );
}

export function MiniMoon({ lightOn, lampAngle, onLampAngle, lowGraphics, height = 320 }: { lightOn: boolean; lampAngle: number; onLampAngle: (a: number) => void; lowGraphics?: boolean; height?: number }) {
  const labelRefs = useLabelRefs();
  const labels = useMemo(() => miniLabels(lightOn, lampAngle), [lightOn, lampAngle]);
  return (
    <div className="lab__view" style={{ minHeight: height, height }}>
      <Canvas frameloop="demand" dpr={lowGraphics ? 1 : [1, 1.5]} camera={{ fov: 42, position: [0, 9.5, 0] }} gl={{ antialias: !lowGraphics, powerPreference: 'low-power' }} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
        <Scene lightOn={lightOn} lampAngle={lampAngle} onLampAngle={onLampAngle} labels={labels} labelRefs={labelRefs} />
      </Canvas>
      <LabelLayer labels={labels} refs={labelRefs} />
      <div className="lab__badge">
        <span className="chip chip--on-dark">위에서 내려다본 모습</span>
      </div>
    </div>
  );
}

/** WebGL 을 쓸 수 없을 때: 같은 장면을 간단한 그림으로 */
export function MiniMoonFlat({ lightOn, lampAngle, size = 300 }: { lightOn: boolean; lampAngle: number; size?: number }) {
  const c = size / 2;
  const r = size * 0.2;
  const a = lampAngle * DEG;
  const lx = c + Math.cos(a) * size * 0.38;
  const ly = c - Math.sin(a) * size * 0.38;
  const rot = -lampAngle;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={lightOn ? '위에서 내려다본 달. 전등을 향한 쪽 절반이 밝아요.' : '위에서 내려다본 달. 전등이 꺼져 있어 달이 보이지 않아요.'} style={{ background: '#02120f', borderRadius: 16, maxWidth: '100%', height: 'auto' }}>
      <circle cx={c} cy={c} r={r} fill={lightOn ? '#2a2a30' : 'none'} stroke={lightOn ? 'none' : '#9aa0a6'} strokeDasharray="4 4" />
      {lightOn ? <path d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`} fill="#ece9dc" transform={`rotate(${rot} ${c} ${c})`} /> : null}
      <circle cx={lx} cy={ly} r={size * 0.05} fill={lightOn ? '#ffd866' : '#6b6b55'} />
      <text x={lx} y={ly - size * 0.07} fontSize={12} fill="#ffe7a0" textAnchor="middle">
        전등
      </text>
      <text x={c} y={c + r + 16} fontSize={12} fill="#fff" textAnchor="middle">
        달
      </text>
    </svg>
  );
}
