/**
 * 영상 슬롯 (MEDIA_AND_SOURCES.md 1절).
 * youtubeId 가 null 이면 화면에 '영상 자리'와 어떤 영상이 들어갈지 표시된다.
 * 교사가 실제 재생·학교망 접속·임베드 허용·자막을 확인한 뒤 youtubeId 를 채운다.
 * 자동 재생 금지, 제목·제공 기관·학습 목적을 재생 전에 표시, 시청 전 예측 1문항·시청 후 비교 1문항.
 */
export interface VideoSlotDef {
  id: string;
  title: string;
  provider: string;
  officialUrl: string;
  candidateUrl: string;
  /** 교사가 확인 후 채우는 값. 후보: URL 의 v= 값 */
  youtubeId: string | null;
  placements: string[];
  purpose: string;
  beforeQuestion: string;
  afterQuestion: string;
  summaryKo: string;
  caution: string;
}

export const VIDEO_SLOTS: VideoSlotDef[] = [
  {
    id: 'video-phases-shadows',
    title: 'NASA Spotlite: Moon Phases and Shadows',
    provider: 'NASA eClips',
    officialUrl: 'https://science.nasa.gov/eclips/videos/moon-phases-and-shadows/',
    candidateUrl: 'https://www.youtube.com/watch?v=_5AG2dFxe4s',
    youtubeId: null,
    placements: ['s02', 's08'],
    purpose: '달 모양이 바뀌는 까닭을 그림자와 헷갈리지 않았는지 확인해요.',
    beforeQuestion: '지구 그림자가 달에 닿지 않아도 초승달이 보일까? 내 모형으로 먼저 예측해 보자.',
    afterQuestion: '영상의 설명과 내 3D 모형에서 공통으로 확인한 사실을 한 가지 써 보자.',
    summaryKo: '달 모양이 바뀌는 것은 그림자 때문이 아니에요. 햇빛을 받는 달의 절반 중 지구에서 보이는 부분이 달라지기 때문이에요. 영상은 이것을 그림자와 비교해서 보여 줘요.',
    caution: '영어 영상. 한국어 자막 제공 여부는 교사가 확인한 뒤 안내한다. 영상에 정답을 맡기지 말고 학생의 조작 증거와 연결한다.',
  },
  {
    id: 'video-solar-role',
    title: "The Moon's Role in a Solar Eclipse",
    provider: 'NASA',
    officialUrl: 'https://science.nasa.gov/resource/the-moons-role-in-a-solar-eclipse-2/',
    candidateUrl: 'https://www.youtube.com/watch?v=jxanWTR8-yM',
    youtubeId: null,
    placements: ['s10'],
    purpose: '일식 때 달과 달의 그림자가 무슨 일을 하는지 살펴봐요.',
    beforeQuestion: '달 그림자가 지구에 닿으면 지구 어디에서나 같은 모습이 보일까?',
    afterQuestion: '일식 때 태양, 달, 지구가 어떻게 늘어서는지, 그리고 지구의 어느 곳에서 보느냐에 따라 무엇이 달라지는지 내 모형에서 찾아보자.',
    summaryKo: '달이 태양을 가리면 달의 그림자가 지구의 좁은 곳에만 닿아요. 그래서 일식은 지구의 어디에서나 똑같이 보이지 않아요.',
    caution: '교사가 내용을 미리 확인하고 학생 수준에 맞는 짧은 구간만 사용한다. 부분·개기·금환의 세부 분류는 선택 심화.',
  },
  {
    id: 'video-lunar',
    title: 'Understanding Lunar Eclipses',
    provider: 'NASA',
    officialUrl: 'https://science.nasa.gov/learn/heat/resource/understanding-lunar-eclipses/',
    candidateUrl: 'https://www.youtube.com/watch?v=lNi5UFpales',
    youtubeId: null,
    placements: ['s10', 's11'],
    purpose: '월식이 지구의 그림자 때문에 생긴다는 것을 확인하고 일식과 비교해요.',
    beforeQuestion: '보름달일 때도 태양, 지구, 달이 거의 한 줄인데, 왜 보름달마다 월식이 일어나지는 않을까?',
    afterQuestion: '월식 때 어두운 부분과 초승달의 어두운 부분은 무엇이 다를까? 달이 있는 자리와 햇빛으로 설명해 보자.',
    summaryKo: '월식은 달이 지구의 그림자 속으로 들어가서 어두워지는 일이에요. 영상에 나오는 날짜는 예전 이야기이고, 앞으로 월식이 일어날 날을 알려 주는 것이 아니에요.',
    caution: '과거에 제작된 영상이므로 영상 속 식 날짜를 현재 예보처럼 표시하지 않는다. 붉은색의 원리는 짧은 추가 설명으로만 제공한다.',
  },
];

export function videoSlot(id: string): VideoSlotDef | undefined {
  return VIDEO_SLOTS.find((v) => v.id === id);
}
