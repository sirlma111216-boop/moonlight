/**
 * 관측 자료(실사진) 매니페스트 — 교사가 파일을 확보한 뒤 이 파일을 채운다.
 *
 * 사용 방법
 *  1. 사진 파일을 `public/media/observations/` 또는 `public/media/eclipses/` 에 넣는다.
 *     (파일명에 학생·촬영자 이름을 넣지 않는다.)
 *  2. 아래 항목의 `src` 를 '/media/observations/파일명.jpg' 처럼 채우고 메타데이터를 적는다.
 *     외부 URL(예: NASA 페이지의 이미지 주소)도 가능하다. 이용 조건은 반드시 확인한다.
 *  3. `src` 가 null 인 항목은 앱에서 '미확보'로 표시되고 학생 화면에는 자리 표시만 나온다.
 *
 * 규칙 (IMAGE_PROMPTS.md 3절, MEDIA_AND_SOURCES.md 4절, 수정 지시 R10)
 *  - kind='real' 은 출처·촬영 정보가 있는 실제 관측 사진만. 생성 이미지·시뮬레이션은 real 로 등록할 수 없다.
 *  - NASA SVS 위상 렌더(Dial-a-Moon 등)는 kind='simulation' 으로만 등록하며 01의 '실제 사진 3장'에는 쓰이지 않는다.
 *    07에서 '앱 계산과 비교할 참고 렌더'로만 사용된다.
 *  - takenAt 을 모르면 null 로 두고 takenUnknown=true. 임의의 날짜를 붙이지 않는다.
 *
 * 교사 콘솔(P1)에서 등록한 자료는 D1 에 저장되며 이 매니페스트와 합쳐져 보인다.
 */
import type { MediaAsset } from './types';

type ManifestEntry = Omit<MediaAsset, 'origin' | 'classId' | 'createdAt'>;

export const MEDIA_MANIFEST: ManifestEntry[] = [
  // ── 01·03·07 위상 관측 사진 (핵심 자료, 최소 3장 · 권장 4~8장, 날짜가 서로 다른 것) ──
  {
    id: 'moon-observation-1',
    kind: 'real',
    category: 'phase',
    title: '관측 사진 1 (예: 초승달 무렵)',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: 'Asia/Seoul',
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s01', 's03', 's07'],
    src: null, // 예: '/media/observations/moon-observation-1.jpg'
  },
  {
    id: 'moon-observation-2',
    kind: 'real',
    category: 'phase',
    title: '관측 사진 2 (예: 상현 무렵)',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: 'Asia/Seoul',
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s01', 's03', 's07'],
    src: null,
  },
  {
    id: 'moon-observation-3',
    kind: 'real',
    category: 'phase',
    title: '관측 사진 3 (예: 보름 무렵)',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: 'Asia/Seoul',
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s01', 's03', 's07'],
    src: null,
  },
  {
    id: 'moon-observation-4',
    kind: 'real',
    category: 'phase',
    title: '관측 사진 4 (예: 하현 무렵, 선택)',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: 'Asia/Seoul',
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s03', 's07'],
    src: null,
  },
  // ── 09·10 식 현상 비교 사진 (핵심 자료) ──
  {
    id: 'eclipse-observation-solar',
    kind: 'real',
    category: 'solar-eclipse',
    title: '일식 관측 사진',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: null,
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s09', 's10'],
    src: null, // 예: '/media/eclipses/eclipse-observation-solar.jpg'
  },
  {
    id: 'eclipse-observation-lunar',
    kind: 'real',
    category: 'lunar-eclipse',
    title: '월식 관측 사진',
    photographer: '',
    sourceUrl: null,
    takenAt: null,
    takenTz: null,
    takenUnknown: true,
    region: null,
    processing: null,
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s09', 's10'],
    src: null,
  },
  // ── 07 참고 렌더(선택) — 반드시 simulation. 01의 실제 사진으로는 쓰이지 않는다 ──
  {
    id: 'svs-phase-render-reference',
    kind: 'simulation',
    category: 'phase',
    title: 'NASA SVS 위상 렌더(참고, 시뮬레이션)',
    photographer: 'NASA Scientific Visualization Studio',
    sourceUrl: 'https://svs.gsfc.nasa.gov/',
    takenAt: null,
    takenTz: null,
    takenUnknown: true,
    region: null,
    processing: '렌더링(시뮬레이션)',
    license: '',
    credit: '',
    alt: '',
    useSteps: ['s07'],
    src: null,
  },
];

export function manifestAssets(): MediaAsset[] {
  return MEDIA_MANIFEST.map((m) => ({ ...m, origin: 'manifest', classId: null, createdAt: '' }));
}
