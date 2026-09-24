/**
 * 장식 삽화 슬롯 (IMAGE_PROMPTS.md 1·2절). 교사가 이미지 생성 도구로 만든 파일을
 * `public/illustrations/` 에 넣고 아래 `src` 를 채운다. null 이면 화면에 자리와 용도가 표시된다.
 * 장식 이미지 없이도 핵심 학습은 작동한다. 이 이미지는 과학적 증거로 쓰이지 않는다.
 */
export interface AssetSlotDef {
  id: string;
  fileName: string;
  usage: string;
  promptRef: string;
  aspect: '16/9' | '4/3' | '1/1';
  alt: string;
  src: string | null;
}

export const ASSET_SLOTS: Record<string, AssetSlotDef> = {
  'intro-observation': {
    id: 'intro-observation',
    fileName: 'intro-observation.webp',
    usage: '01 도입 배경 — 창가에서 저녁 하늘을 바라보는 학생. 왼쪽 40%는 제목 여백.',
    promptRef: 'IMAGE_PROMPTS.md 2절 A',
    aspect: '16/9',
    alt: '창가에서 하늘을 바라보며 관측 노트를 준비하는 학생의 삽화.',
    src: null, // 예: '/illustrations/intro-observation.webp'
  },
  'evidence-desk': {
    id: 'evidence-desk',
    fileName: 'evidence-desk.webp',
    usage: '04 공공데이터 미션 도입 카드 — 단서를 모으는 책상.',
    promptRef: 'IMAGE_PROMPTS.md 2절 B',
    aspect: '16/9',
    alt: '달력과 관측 노트, 자료 카드를 펼쳐 놓은 책상의 삽화.',
    src: null,
  },
  'model-lab': {
    id: 'model-lab',
    fileName: 'model-lab.webp',
    usage: '05~06 3D 활동 도입 — 모형 실험실 입구.',
    promptRef: 'IMAGE_PROMPTS.md 2절 C',
    aspect: '16/9',
    alt: '모형 실험을 준비한 가상 실험실의 삽화.',
    src: null,
  },
  'shadow-mystery': {
    id: 'shadow-mystery',
    fileName: 'shadow-mystery.webp',
    usage: '09 심화 진입 제목 배경 — 빛과 그림자의 대비.',
    promptRef: 'IMAGE_PROMPTS.md 2절 D',
    aspect: '16/9',
    alt: '빛과 그림자의 대비를 표현한 심화 활동 도입 삽화.',
    src: null,
  },
  'report-cover': {
    id: 'report-cover',
    fileName: 'report-cover.webp',
    usage: '12 보고서 완료 카드·인쇄 보고서 선택 표지(밝은 배경).',
    promptRef: 'IMAGE_PROMPTS.md 2절 E',
    aspect: '4/3',
    alt: '관측 도구와 노트를 표현한 개인 보고서 표지 삽화.',
    src: null,
  },
  'achievement-emblems': {
    id: 'achievement-emblems',
    fileName: 'achievement-emblems.webp',
    usage: '배지 장식 4종(자료 해석가·달 복원가·그림자 추적자·달 설명서 완성). 없으면 텍스트 배지로 표시.',
    promptRef: 'IMAGE_PROMPTS.md 2절 F',
    aspect: '1/1',
    alt: '',
    src: null,
  },
};

/** 달 표면 텍스처 (NASA SVS CGI Moon Kit 색상 맵을 2K 이하로 축소한 파일). 없으면 균일한 회색 재질. */
export const MOON_TEXTURE: { src: string | null; credit: string | null; note: string } = {
  src: null, // 예: '/textures/moon-color-2k.jpg'
  credit: null, // 예: 'NASA Scientific Visualization Studio, CGI Moon Kit'
  note: '이용 조건이 확인된 공식 텍스처만 사용한다. 파일이 없으면 균일한 회색 재질로 표시된다.',
};
