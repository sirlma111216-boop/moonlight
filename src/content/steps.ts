import type { LessonMode } from '@shared/types';
import type { StepId } from '@shared/questionIds';

export interface SceneDef {
  id: string;
  title: string;
  /** 이 장면이 포함되는 수업 모드 */
  modes: LessonMode[];
  /** 선택 장면은 단계 완료 조건에 들어가지 않는다 */
  optional?: boolean;
}

export interface StepDef {
  id: StepId;
  number: number;
  title: string;
  subtitle: string;
  /** 핵심 경험 한 줄 */
  experience: string;
  /** 남기는 결과 */
  outcome: string;
  minutes: Record<LessonMode, number>;
  scenes: SceneDef[];
}

const both: LessonMode[] = ['3', '2'];
const three: LessonMode[] = ['3'];

export const STEPS: StepDef[] = [
  {
    id: 's01',
    number: 1,
    title: '같은 달, 다른 얼굴',
    subtitle: '실제 사진을 비교하고 첫 생각을 고른다',
    experience: '날짜가 다른 실제 달 사진 3장을 비교하고 첫 생각을 고른다.',
    outcome: '사전 생각과 이유, 내 질문',
    minutes: { '3': 5, '2': 3 },
    scenes: [
      { id: 's01-photos', title: '세 장의 달', modes: both },
      { id: 's01-question', title: '왜 달라질까?', modes: both },
      { id: 's01-my-question', title: '내 질문', modes: both },
      { id: 's01-pair', title: '짝과 비교하기', modes: both },
      { id: 's01-teaser', title: '달을 살짝 움직여 보기', modes: both, optional: true },
    ],
  },
  {
    id: 's02',
    number: 2,
    title: '달빛의 정체',
    subtitle: '반사, 밝은 절반, 보이는 부분',
    experience: '광원을 켜고 달의 밝은 부분을 예측한 뒤, 전체 표면과 보이는 원반을 구분한다.',
    outcome: '개념 응답',
    minutes: { '3': 10, '2': 7 },
    scenes: [
      { id: 's02-light', title: '광원이 켜지면', modes: both },
      { id: 's02-halves', title: '두 가지 절반', modes: both },
      { id: 's02-positions', title: '위치가 바뀌면', modes: both },
      { id: 's02-check', title: '확인 문항', modes: both },
      { id: 's02-pair', title: '짝과 비교하기', modes: three },
      { id: 's02-video', title: '더 알아보기: 영상', modes: three, optional: true },
    ],
  },
  {
    id: 's03',
    number: 3,
    title: '나의 관측 기록',
    subtitle: '내 기록 또는 출처 있는 관측 자료 읽기',
    experience: '직접 관측한 달을 그리거나, 출처 있는 실제 관측 자료를 골라 관측 카드를 만든다.',
    outcome: '관측 카드',
    minutes: { '3': 10, '2': 5 },
    scenes: [
      { id: 's03-choose', title: '두 갈래 길', modes: both },
      { id: 's03-card', title: '관측 카드', modes: both },
      { id: 's03-sources', title: '출처를 구분하기', modes: three },
    ],
  },
  {
    id: 's04',
    number: 4,
    title: '공공데이터 달력 수사',
    subtitle: '월령·출몰 자료를 읽고 관측 계획 세우기',
    experience: '한국천문연구원 자료로 월령과 월출·월몰을 읽고, 날짜를 비교해 관측 계획을 세운다.',
    outcome: '비교표·근거·계획',
    minutes: { '3': 20, '2': 10 },
    scenes: [
      { id: 's04-load', title: '자료 가져오기', modes: both },
      { id: 's04-read-row', title: '한 행 읽기', modes: both },
      { id: 's04-compare', title: '여러 날짜 비교', modes: both },
      { id: 's04-plan', title: '오늘 밤 관측 계획서', modes: both },
      { id: 's04-visible', title: '떠 있으면 보일까?', modes: three },
      { id: 's04-target', title: '목표 카드 만들기', modes: both },
    ],
  },
  {
    id: 's05',
    number: 5,
    title: '우주에서 보기, 지구에서 보기',
    subtitle: '3D 두 시점과 조작법 익히기',
    experience: '우주 시점과 지구 시점을 함께 보며 달을 움직이는 법을 익힌다.',
    outcome: '예측과 조작 기록',
    minutes: { '3': 7, '2': 5 },
    scenes: [
      { id: 's05-intro', title: '두 개의 창', modes: both },
      { id: 's05-predict', title: '옮기면 어떻게 보일까?', modes: both },
    ],
  },
  {
    id: 's06',
    number: 6,
    title: '달의 얼굴 복원소',
    subtitle: '대표 위상 재현, 이유 설명',
    experience: '모양만 보고 달을 옮겨 대표 위상을 재현하고 이유를 설명한다.',
    outcome: '모형 스냅샷·설명',
    minutes: { '3': 15, '2': 10 },
    scenes: [
      { id: 's06-restore', title: '대표 위상 재현', modes: both },
      { id: 's06-self', title: '내가 정한 목표', modes: both },
    ],
  },
  {
    id: 's07',
    number: 7,
    title: '내 자료를 우주에 놓기',
    subtitle: '관측·자료의 위상을 모형으로 재현',
    experience: '내 관측 카드와 공공데이터 근거를 모형과 나란히 놓고 비교한다.',
    outcome: '자료와 모형 비교',
    minutes: { '3': 13, '2': 3 },
    scenes: [
      { id: 's07-place', title: '자료를 재현하기', modes: both },
      { id: 's07-facts', title: '네 가지 사실', modes: both },
    ],
  },
  {
    id: 's08',
    number: 8,
    title: '설명을 시험하라',
    subtitle: '오개념 미션과 나의 주장',
    experience: '달 연구소의 오류를 모형으로 반박하고 내 주장을 시험한다.',
    outcome: '처음/나중 설명',
    minutes: { '3': 10, '2': 8 },
    scenes: [
      { id: 's08-mission1', title: '오류 1: 지구 그림자?', modes: both },
      { id: 's08-mission2', title: '오류 2: 언제나 반달?', modes: three },
      { id: 's08-claim', title: '내 주장 시험하기', modes: both },
      { id: 's08-revisit', title: '처음 생각 다시 보기', modes: both },
      { id: 's08-pair', title: '짝과 비교하기', modes: three },
      { id: 's08-video', title: '더 알아보기: 영상', modes: three, optional: true },
    ],
  },
  {
    id: 's09',
    number: 9,
    title: '초승달과 월식은 같은 현상일까?',
    subtitle: '심화 시작 — 사진 분류와 예측',
    experience: '위상·일식·월식 사진을 나란히 놓고 무엇이 가렸는지, 그림자가 어디 생기는지 분류한다.',
    outcome: '분류 이유',
    minutes: { '3': 5, '2': 3 },
    scenes: [
      { id: 's09-classify', title: '세 장면 분류하기', modes: both },
      { id: 's09-pair', title: '짝과 비교하기', modes: both },
    ],
  },
  {
    id: 's10',
    number: 10,
    title: '그림자가 만든 사건',
    subtitle: '일식과 월식을 각각 직접 만들기',
    experience: '일식과 월식 배치를 각각 만들고 그림자가 닿는 대상을 확인한다.',
    outcome: '두 모형·비교표',
    minutes: { '3': 14, '2': 11 },
    scenes: [
      { id: 's10-solar', title: '일식 실험', modes: both },
      { id: 's10-lunar', title: '월식 실험', modes: both },
      { id: 's10-table', title: '비교표 완성', modes: both },
      { id: 's10-videos', title: '더 알아보기: 영상·안전', modes: three, optional: true },
    ],
  },
  {
    id: 's11',
    number: 11,
    title: '왜 매달 일어나지 않을까?',
    subtitle: '궤도면 기울기와 어긋남 시험',
    experience: '기울기 0°와 실제 기울기, 교선 방향을 바꾸며 식이 생기는 조건을 비교한다.',
    outcome: '조건 비교·설명',
    minutes: { '3': 11, '2': 5 },
    scenes: [
      { id: 's11-a', title: '장면 A: 기울기가 0°라면', modes: both },
      { id: 's11-b', title: '장면 B: 실제 기울기', modes: both },
      { id: 's11-c', title: '장면 C: 만나는 방향', modes: both, optional: false },
      { id: 's11-explain', title: '이유 설명하기', modes: both },
    ],
  },
  {
    id: 's12',
    number: 12,
    title: '나의 달 설명서',
    subtitle: '근거를 연결한 보고서와 마무리 문항',
    experience: '이전 활동의 근거를 모아 보고서를 완성하고 처음 생각과 비교한다.',
    outcome: '개인 보고서',
    minutes: { '3': 15, '2': 13 },
    scenes: [
      { id: 's12-identity', title: '보고서 정보', modes: both },
      { id: 's12-write', title: '보고서 쓰기', modes: both },
      { id: 's12-final', title: '마무리 문항', modes: both },
      { id: 's12-submit', title: '제출·인쇄·내보내기', modes: both },
      { id: 's12-challenge', title: '이번 주 관측 도전', modes: both, optional: true },
    ],
  },
];

/** 2차시 모드에서 11-C 는 선택 */
export function scenesFor(step: StepDef, mode: LessonMode): SceneDef[] {
  return step.scenes
    .filter((s) => s.modes.includes(mode))
    .map((s) => (mode === '2' && s.id === 's11-c' ? { ...s, optional: true } : s));
}

export interface PeriodDef {
  number: 1 | 2 | 3;
  title: string;
  question: string;
  todos: string[];
  steps: StepId[];
  closingQuestion: string;
}

export const PERIODS: Record<LessonMode, PeriodDef[]> = {
  '3': [
    {
      number: 1,
      title: '1차시 — 관측과 자료',
      question: '같은 달인데 왜 밝게 보이는 부분이 달라질까?',
      todos: ['실제 사진을 비교하고 첫 생각을 고른다', '달빛의 정체를 확인 문항으로 점검한다', '공공데이터로 관측 날짜를 추적한다'],
      steps: ['s01', 's02', 's03', 's04'],
      closingQuestion: '내가 고른 날짜의 달은 우주에서 보면 어디에 있을까?',
    },
    {
      number: 2,
      title: '2차시 — 우주에서 보기',
      question: '달을 어디에 놓으면 지구에서 그 모양이 보일까?',
      todos: ['두 시점으로 달을 움직여 본다', '대표 위상과 내 자료의 위상을 재현한다', '오개념을 모형으로 반박하고 내 주장을 시험한다'],
      steps: ['s05', 's06', 's07', 's08'],
      closingQuestion: '달이 어둡게 보이는 두 가지 현상, 위상과 월식은 무엇이 다를까?',
    },
    {
      number: 3,
      title: '3차시 — 그림자와 설명서',
      question: '초승달과 월식은 같은 현상일까?',
      todos: ['일식과 월식을 각각 만든다', '매달 식이 일어나지 않는 이유를 시험한다', '근거를 연결한 나의 달 설명서를 완성한다'],
      steps: ['s09', 's10', 's11', 's12'],
      closingQuestion: '다음에 달을 볼 때, 처음 생각과 무엇이 달라져 있을까?',
    },
  ],
  '2': [
    {
      number: 1,
      title: '1차시 — 관측·자료·모형',
      question: '같은 달인데 왜 밝게 보이는 부분이 달라질까?',
      todos: ['실제 사진을 비교하고 첫 생각을 고른다', '공공데이터로 날짜를 읽고 비교한다', '3D 모형으로 대표 위상을 재현한다'],
      steps: ['s01', 's02', 's03', 's04', 's05', 's06'],
      closingQuestion: '내 자료의 달은 우주에서 어디에 있을까?',
    },
    {
      number: 2,
      title: '2차시 — 그림자와 설명서',
      question: '초승달과 월식은 같은 현상일까?',
      todos: ['내 자료의 위상을 재현하고 주장을 시험한다', '일식과 월식을 각각 만든다', '보고서를 완성한다'],
      steps: ['s07', 's08', 's09', 's10', 's11', 's12'],
      closingQuestion: '다음에 달을 볼 때, 처음 생각과 무엇이 달라져 있을까?',
    },
  ],
};

export function stepById(id: string): StepDef | undefined {
  return STEPS.find((s) => s.id === id);
}

export function periodOfStep(mode: LessonMode, stepId: StepId): PeriodDef {
  return PERIODS[mode].find((p) => p.steps.includes(stepId)) ?? PERIODS[mode][0];
}
