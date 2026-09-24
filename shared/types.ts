/** 클라이언트와 Worker가 함께 쓰는 도메인 타입 (원문 13절) */

export type LessonMode = '3' | '2';

export type SourceType =
  | 'my-observation' // 나의 관측
  | 'provided-observation' // 제공된 실제 관측
  | 'institution-forecast' // 기관 예측 자료
  | 'app-calculation' // 앱 계산
  | 'learning-model'; // 학습 모형

export const SOURCE_LABEL: Record<SourceType, string> = {
  'my-observation': '나의 관측',
  'provided-observation': '제공된 실제 관측',
  'institution-forecast': '기관 예측 자료',
  'app-calculation': '앱 계산',
  'learning-model': '학습 모형',
};

export type ProgressStatus = 'visited' | 'answered' | 'completed';

export interface ClassSettings {
  /** 보고서 식별 항목 중 켤 것 */
  identityFields: { name: boolean; grade: boolean; classNo: boolean; number: boolean };
  /** 03 사진 업로드(P2) */
  photoUploadEnabled: boolean;
  /** 차시별 권장 시간(분) 조정치 */
  periodMinutes: number;
  /** 영상 선택: 슬롯 id → 사용 여부 */
  videos: Record<string, boolean>;
  /** 열린 단계 (닫힌 단계는 학생이 진입할 수 없다) */
  openSteps: string[];
  /** 관측 계획 미션 목표 시간대 */
  observationWindow: { start: string; end: string };
}

export interface ClassSession {
  id: string;
  code: string;
  title: string;
  mode: LessonMode;
  region: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  settings: ClassSettings;
  retentionDays: number;
  createdAt: string;
  expiresAt: string | null;
  archivedAt: string | null;
}

export interface ParticipantPublic {
  id: string;
  /** 화면에 보여줄 임시 표식 (개인정보 아님) */
  tag: string;
  classId: string;
  createdAt: string;
}

export interface ResponseRecord {
  questionId: string;
  stepId: string;
  sceneId: string;
  first: unknown;
  latest: unknown;
  hintsUsed: number;
  version: number;
  updatedAt: string;
}

export interface ProgressRecord {
  stepId: string;
  sceneId: string;
  status: ProgressStatus;
  updatedAt: string;
}

export interface Observation {
  id: string;
  sourceType: 'my-observation' | 'provided-observation';
  /** 제공 자료를 썼다면 그 자료 id */
  mediaAssetId?: string | null;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM, 모르면 null
  timeKnown: boolean;
  region: string;
  /** 달 그리기 캔버스 결과(단순 비트맵을 base64 PNG로) */
  drawingDataUrl?: string | null;
  brightDescription: string;
  direction?: string | null;
  weather?: string | null;
  confidence: 'low' | 'mid' | 'high';
  /** 사진(P2) — R2 키. 업로드가 꺼져 있으면 항상 null */
  photoKey?: string | null;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  /** 코드(정적 매니페스트)에서 온 자료인지 교사 콘솔(D1)에서 등록한 자료인지 */
  origin: 'manifest' | 'teacher';
  classId: string | null;
  kind: 'real' | 'composite' | 'simulation';
  title: string;
  photographer: string;
  sourceUrl: string | null;
  takenAt: string | null; // 'YYYY-MM-DD HH:MM' or null
  takenTz: string | null;
  takenUnknown: boolean;
  region: string | null;
  processing: string | null;
  license: string;
  credit: string;
  alt: string;
  useSteps: string[];
  /** 실제 파일 경로(URL). null 이면 미확보 */
  src: string | null;
  /** 사진 분류(01·07 위상 / 09 일식 / 09 월식 등) */
  category: 'phase' | 'solar-eclipse' | 'lunar-eclipse' | 'other';
  createdAt: string;
}

export interface PublicDataSnapshot {
  id: string;
  provider: 'kasi-lunar-age' | 'kasi-riseset' | 'app-astronomy';
  request: Record<string, string>;
  baseTime: string;
  raw: unknown;
  normalized: unknown;
  isCached: boolean;
  isExample: boolean;
  sourceUrl: string;
  fetchedAt: string;
}

export type ModelMode = 'phase' | 'eclipse-solar' | 'eclipse-lunar' | 'tilt' | 'sandbox';

export interface ModelState {
  theta: number;
  inclination: number;
  nodeLongitude: number;
  /** 카메라 프리셋 */
  view: 'default' | 'top' | 'side';
  showSightline: boolean;
  showLitSide: boolean;
  showShadow: boolean;
  observer?: { lat: number; lon: number } | null;
}

export interface ModelAttempt {
  id: string;
  stepId: string;
  sceneId: string;
  mode: ModelMode;
  targetSource: string; // 'app:full' | 'observation:<id>' | 'publicdata:<date>' | 'self' ...
  target: unknown;
  state: ModelState;
  submitted: boolean;
  result: unknown;
  hintsUsed: number;
  /** 자유 실험(sandbox) 기록은 실제 날짜 모드의 상태를 덮어쓰지 않는다 */
  isSandbox: boolean;
  createdAt: string;
}

export interface ReportIdentity {
  name?: string;
  grade?: string;
  classNo?: string;
  number?: string;
}

export interface ReportSection {
  id: string;
  required: boolean;
  /** 이전 단계에서 불러온 원문 */
  imported: string;
  /** 학생이 '한 문장 고치기'로 바꾼 최종 문장. 그대로 두면 imported 와 같다 */
  text: string;
  kept: boolean;
  /** 근거 참조 */
  refs: { kind: string; id: string; label: string }[];
}

export interface Report {
  id: string;
  identity: ReportIdentity;
  sections: ReportSection[];
  attachSandbox: boolean;
  version: number;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  updatedAt: string;
}

export interface BadgeRecord {
  badgeId: 'data-interpreter' | 'moon-restorer' | 'shadow-tracker' | 'manual-complete';
  awardedAt: string;
}

/** 학생이 한 번에 받는 전체 학습 기록 */
export interface StudentBundle {
  participant: ParticipantPublic;
  classSession: ClassSession;
  responses: ResponseRecord[];
  progress: ProgressRecord[];
  observations: Observation[];
  snapshots: PublicDataSnapshot[];
  attempts: ModelAttempt[];
  report: Report | null;
  badges: BadgeRecord[];
  challenge: ObservationChallenge | null;
  mediaAssets: MediaAsset[];
}

export interface ObservationChallenge {
  candidateDate: string;
  predictionDrawingDataUrl: string | null;
  predictionNote: string;
  observed: 'yes' | 'no' | null;
  followupNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  lastSavedAt: string | null;
  pending: number;
}
