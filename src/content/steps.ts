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
  /** 무엇을 하는지 한 줄 */
  experience: string;
  /** 이 단계에서 남기는 것 */
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
    subtitle: '실제 달 사진을 비교하고 내 생각을 골라요',
    experience: '날짜가 다른 달 사진 세 장을 비교하고 내 생각을 골라요.',
    outcome: '내 첫 생각과 까닭, 내 질문',
    minutes: { '3': 5, '2': 3 },
    scenes: [
      { id: 's01-photos', title: '달 사진 세 장', modes: both },
      { id: 's01-question', title: '왜 달라 보일까?', modes: both },
      { id: 's01-my-question', title: '내가 궁금한 것', modes: both },
      { id: 's01-pair', title: '짝과 이야기하기', modes: both },
      { id: 's01-teaser', title: '달을 살짝 움직여 보기', modes: both, optional: true },
    ],
  },
  {
    id: 's02',
    number: 2,
    title: '달은 왜 빛날까',
    subtitle: '햇빛을 받는 쪽과 내 눈에 보이는 쪽',
    experience: '전등을 켜서 달의 어느 쪽이 밝아지는지 보고, 지구에서는 어떻게 보이는지 알아봐요.',
    outcome: '확인 문항 답',
    minutes: { '3': 10, '2': 7 },
    scenes: [
      { id: 's02-light', title: '전등을 켜면', modes: both },
      { id: 's02-halves', title: '보는 자리에 따라', modes: both },
      { id: 's02-positions', title: '달 모양의 순서', modes: both },
      { id: 's02-check', title: '확인 문항', modes: both },
      { id: 's02-pair', title: '짝과 이야기하기', modes: three },
      { id: 's02-video', title: '더 알아보기: 영상', modes: three, optional: true },
    ],
  },
  {
    id: 's03',
    number: 3,
    title: '나의 관측 기록',
    subtitle: '내가 본 달이나 실제 사진을 기록해요',
    experience: '직접 본 달을 그리거나, 선생님이 준 실제 사진을 골라 관측 카드를 만들어요.',
    outcome: '관측 카드',
    minutes: { '3': 10, '2': 5 },
    scenes: [
      { id: 's03-choose', title: '두 갈래 길', modes: both },
      { id: 's03-card', title: '관측 카드', modes: both },
      { id: 's03-sources', title: '자료 이름표 알아보기', modes: three },
    ],
  },
  {
    id: 's04',
    number: 4,
    title: '달력 속 달 찾기',
    subtitle: '천문연구원 자료로 월령과 달 뜨는 시각 읽기',
    experience: '천문연구원 자료로 월령과 달이 뜨고 지는 시각을 읽고, 달을 볼 날을 골라요.',
    outcome: '비교한 날짜, 근거, 관측 계획',
    minutes: { '3': 20, '2': 10 },
    scenes: [
      { id: 's04-load', title: '자료 가져오기', modes: both },
      { id: 's04-read-row', title: '한 줄 읽기', modes: both },
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
    subtitle: '3D 모형 쓰는 법 익히기',
    experience: '우주에서 내려다본 모습과 지구에서 본 모습을 함께 보며 달을 옮겨 봐요.',
    outcome: '예측과 확인',
    minutes: { '3': 7, '2': 5 },
    scenes: [
      { id: 's05-intro', title: '두 개의 창', modes: both },
      { id: 's05-predict', title: '옮기면 어떻게 보일까?', modes: both },
    ],
  },
  {
    id: 's06',
    number: 6,
    title: '달 모양 되살리기',
    subtitle: '모양만 보고 달의 자리 찾기',
    experience: '모양만 보고 달을 알맞은 자리에 놓고 까닭을 설명해요.',
    outcome: '내 모형과 설명',
    minutes: { '3': 15, '2': 10 },
    scenes: [
      { id: 's06-restore', title: '모양 보고 자리 찾기', modes: both },
      { id: 's06-self', title: '내가 정한 목표', modes: both },
    ],
  },
  {
    id: 's07',
    number: 7,
    title: '내 자료를 우주에 놓기',
    subtitle: '내가 본 달을 모형으로 다시 만들기',
    experience: '내 관측 카드와 천문연구원 자료를 모형과 나란히 놓고 비교해요.',
    outcome: '자료와 모형 비교',
    minutes: { '3': 13, '2': 3 },
    scenes: [
      { id: 's07-place', title: '자료 속 달 다시 만들기', modes: both },
      { id: 's07-facts', title: '네 가지 사실', modes: both },
    ],
  },
  {
    id: 's08',
    number: 8,
    title: '설명을 시험하라',
    subtitle: '틀린 설명 찾기와 내 주장 시험하기',
    experience: '달 연구소의 틀린 설명을 모형으로 반박하고, 내 주장도 시험해요.',
    outcome: '처음 생각과 바뀐 생각',
    minutes: { '3': 10, '2': 8 },
    scenes: [
      { id: 's08-mission1', title: '틀린 설명 1: 지구 그림자?', modes: both },
      { id: 's08-mission2', title: '틀린 설명 2: 언제나 반달?', modes: three },
      { id: 's08-claim', title: '내 주장 시험하기', modes: both },
      { id: 's08-revisit', title: '처음 생각 다시 보기', modes: both },
      { id: 's08-pair', title: '짝과 이야기하기', modes: three },
      { id: 's08-video', title: '더 알아보기: 영상', modes: three, optional: true },
    ],
  },
  {
    id: 's09',
    number: 9,
    title: '초승달과 월식은 같은 걸까?',
    subtitle: '한 걸음 더 — 어두운 달 세 장면 나누기',
    experience: '달이 어둡게 보이는 세 장면을 보고, 무엇이 무엇을 가렸는지 나눠 봐요.',
    outcome: '나눈 까닭',
    minutes: { '3': 5, '2': 3 },
    scenes: [
      { id: 's09-classify', title: '세 장면 나누기', modes: both },
      { id: 's09-pair', title: '짝과 이야기하기', modes: both },
    ],
  },
  {
    id: 's10',
    number: 10,
    title: '그림자가 만든 사건',
    subtitle: '일식과 월식을 직접 만들어 보기',
    experience: '일식과 월식이 일어나는 모습을 각각 만들고 그림자가 어디에 생기는지 봐요.',
    outcome: '두 모형과 비교표',
    minutes: { '3': 14, '2': 11 },
    scenes: [
      { id: 's10-solar', title: '일식 실험', modes: both },
      { id: 's10-lunar', title: '월식 실험', modes: both },
      { id: 's10-table', title: '비교표 채우기', modes: both },
      { id: 's10-videos', title: '더 알아보기: 영상과 안전', modes: three, optional: true },
    ],
  },
  {
    id: 's11',
    number: 11,
    title: '왜 매달 일어나지 않을까?',
    subtitle: '달이 도는 길이 살짝 기울어 있다면',
    experience: '달이 도는 길의 기울기와 방향을 바꾸며 일식·월식이 언제 일어나는지 비교해요.',
    outcome: '조건 비교와 설명',
    minutes: { '3': 11, '2': 5 },
    scenes: [
      { id: 's11-a', title: '길이 기울지 않았다면', modes: both },
      { id: 's11-b', title: '실제처럼 조금 기울었다면', modes: both },
      { id: 's11-c', title: '기울어진 방향 바꿔 보기', modes: both, optional: false },
      { id: 's11-explain', title: '까닭 설명하기', modes: both },
    ],
  },
  {
    id: 's12',
    number: 12,
    title: '나의 달 설명서',
    subtitle: '모은 근거로 보고서 완성하기',
    experience: '앞에서 모은 근거로 보고서를 완성하고 처음 생각과 비교해요.',
    outcome: '나의 보고서',
    minutes: { '3': 15, '2': 13 },
    scenes: [
      { id: 's12-identity', title: '보고서에 넣을 정보', modes: both },
      { id: 's12-write', title: '보고서 쓰기', modes: both },
      { id: 's12-final', title: '마무리 문제', modes: both },
      { id: 's12-submit', title: '제출·인쇄·내려받기', modes: both },
      { id: 's12-challenge', title: '이번 주 달 보기 도전', modes: both, optional: true },
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
      title: '1차시 — 달을 보고, 자료를 읽어요',
      question: '같은 달인데 왜 밝게 보이는 부분이 날마다 다를까?',
      todos: ['실제 달 사진을 비교하고 내 생각을 골라요', '전등과 달로 달이 빛나는 까닭을 알아봐요', '천문연구원 자료로 달을 볼 날을 찾아요'],
      steps: ['s01', 's02', 's03', 's04'],
      closingQuestion: '내가 고른 날의 달은 우주에서 보면 어디에 있을까?',
    },
    {
      number: 2,
      title: '2차시 — 우주에서 달을 옮겨 봐요',
      question: '달을 어디에 놓으면 지구에서 그 모양으로 보일까?',
      todos: ['3D 모형으로 달을 옮겨 봐요', '여러 모양의 달과 내 자료 속 달을 다시 만들어요', '틀린 설명을 모형으로 반박하고 내 주장을 시험해요'],
      steps: ['s05', 's06', 's07', 's08'],
      closingQuestion: '달이 어둡게 보이는 두 가지 경우, 달 모양이 바뀔 때와 월식은 무엇이 다를까?',
    },
    {
      number: 3,
      title: '3차시 — 그림자와 나의 설명서',
      question: '초승달과 월식은 같은 걸까?',
      todos: ['일식과 월식을 각각 만들어요', '일식과 월식이 매달 일어나지 않는 까닭을 알아봐요', '근거를 모아 나의 달 설명서를 완성해요'],
      steps: ['s09', 's10', 's11', 's12'],
      closingQuestion: '다음에 달을 볼 때, 처음 생각과 무엇이 달라져 있을까?',
    },
  ],
  '2': [
    {
      number: 1,
      title: '1차시 — 달 보기, 자료 읽기, 모형 만들기',
      question: '같은 달인데 왜 밝게 보이는 부분이 날마다 다를까?',
      todos: ['실제 달 사진을 비교하고 내 생각을 골라요', '천문연구원 자료로 날짜를 읽고 비교해요', '3D 모형으로 달의 여러 모양을 다시 만들어요'],
      steps: ['s01', 's02', 's03', 's04', 's05', 's06'],
      closingQuestion: '내 자료 속 달은 우주에서 어디에 있을까?',
    },
    {
      number: 2,
      title: '2차시 — 그림자와 나의 설명서',
      question: '초승달과 월식은 같은 걸까?',
      todos: ['내 자료 속 달을 다시 만들고 내 주장을 시험해요', '일식과 월식을 각각 만들어요', '보고서를 완성해요'],
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
