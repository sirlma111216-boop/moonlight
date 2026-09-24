/**
 * 교사 익명 집계(R4)와 '생각의 변화' 표가 참조하는 문항 ID. 콘텐츠 파일과 Worker 가 함께 쓴다.
 * 응답 값 모양: 선택형 { choice: string, correct?: boolean }, 서술형 { text: string }, 유지/수정 { verdict: 'keep'|'revise', reason }
 */
export const QID = {
  q01Choice: 'q01-choice',
  q01Reason: 'q01-reason',
  q01MyQuestion: 'q01-my-question',
  q02Required: ['q02-req-1', 'q02-req-2', 'q02-req-3'] as const,
  q08FirstRevisit: 'q08-first-revisit',
  q08Claim: 'q08-claim',
  q09Classify: ['q09-classify-phase', 'q09-classify-solar', 'q09-classify-lunar'] as const,
  q12Final: 'q12-final',
} as const;

export const STEP_IDS = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'] as const;
export type StepId = (typeof STEP_IDS)[number];

/** 교사 검토 대상으로 표시할 서술 문항 */
export const TEACHER_REVIEW_QIDS = ['q08-claim', 'q01-my-question', 'q06-self-predict', 'q12-open-question'];
