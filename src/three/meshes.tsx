import { Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { MOON_TEXTURE } from '@/content/assets';

function TexturedMoon({ radius, src, dark }: { radius: number; src: string; dark: number }) {
  const tex = useLoader(TextureLoader, src);
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshStandardMaterial map={tex} roughness={1} metalness={0} color={darkTint(dark)} />
    </mesh>
  );
}

function darkTint(dark: number): string {
  // dark: 0(정상) ~ 1(본그림자 안). 월식 표시는 판정 결과의 시각화이며 대기 산란 계산이 아니다.
  if (dark <= 0) return '#d9d6cc';
  const r = Math.round(217 - 120 * dark);
  const g = Math.round(214 - 170 * dark);
  const b = Math.round(204 - 170 * dark);
  return `rgb(${r},${g},${b})`;
}

/** 달 — 텍스처가 없으면 균일한 회색 재질(R10). dark 는 월식 판정 시각화 */
export function MoonMesh({ radius, position, dark = 0 }: { radius: number; position?: [number, number, number]; dark?: number }) {
  return (
    <group position={position}>
      {MOON_TEXTURE.src ? (
        <Suspense
          fallback={
            <mesh>
              <sphereGeometry args={[radius, 48, 32]} />
              <meshStandardMaterial color={darkTint(dark)} roughness={1} metalness={0} />
            </mesh>
          }
        >
          <TexturedMoon radius={radius} src={MOON_TEXTURE.src} dark={dark} />
        </Suspense>
      ) : (
        <mesh>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshStandardMaterial color={darkTint(dark)} roughness={1} metalness={0} />
        </mesh>
      )}
    </group>
  );
}

export function EarthMesh({ radius }: { radius: number }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial color="#3d7fb8" roughness={0.9} metalness={0} />
      </mesh>
      {/* 북극 표시 — 위쪽(+Y) 기준을 알려준다 */}
      <mesh position={[0, radius * 1.08, 0]}>
        <coneGeometry args={[radius * 0.06, radius * 0.16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
