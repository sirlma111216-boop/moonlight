import { describe, expect, it } from 'vitest';
import type { ModelAttempt, ResponseRecord, StudentBundle } from '../shared/types';
import { STEPS, scenesFor } from '../src/content/steps';
import { flatScenes, nextTarget, resumeTarget, stepStatus } from '../src/lib/scenes';
import { buildSections } from '../src/lib/report';

function resp(questionId: string, stepId: string, value: unknown, first?: unknown): ResponseRecord {
  return { questionId, stepId, sceneId: `${stepId}-x`, first: first ?? value, latest: value, hintsUsed: 0, version: 1, updatedAt: '' };
}

function attempt(stepId: string, sceneId: string, theta: number, isSandbox = false): ModelAttempt {
  return {
    id: `${stepId}-${sceneId}-${theta}`,
    stepId,
    sceneId,
    mode: isSandbox ? 'sandbox' : 'phase',
    targetSource: 'app:test',
    target: null,
    state: { theta, inclination: 0, nodeLongitude: 0, view: 'default', showSightline: false, showLitSide: false, showShadow: false },
    submitted: true,
    result: { renderer: '3d' },
    hintsUsed: 0,
    isSandbox,
    createdAt: '',
  };
}

function bundle(mode: '2' | '3', extra: Partial<StudentBundle> = {}): StudentBundle {
  return {
    participant: { id: 'p', tag: '달-TEST', classId: 'c', createdAt: '' },
    classSession: {
      id: 'c',
      code: 'ABCDEF',
      title: 't',
      mode,
      region: '서울',
      periodStart: '2026-09-24',
      periodEnd: '2026-09-24',
      settings: {
        identityFields: { name: true, grade: true, classNo: true, number: true },
        photoUploadEnabled: false,
        periodMinutes: 45,
        videos: {},
        openSteps: STEPS.map((s) => s.id),
        observationWindow: { start: '19:00', end: '21:00' },
      },
      retentionDays: 30,
      createdAt: '',
      expiresAt: null,
      archivedAt: null,
    },
    responses: [],
    progress: [],
    observations: [],
    snapshots: [],
    attempts: [],
    report: null,
    badges: [],
    challenge: null,
    mediaAssets: [],
    ...extra,
  };
}

/** 2차시 경로를 끝까지 진행한 학생이 남기는 기록 */
const PATH_RESPONSES = [
  resp('q01-choice', 's01', { choice: 'a' }),
  resp('q01-reason', 's01', { text: '그림자 때문일 것 같다' }),
  resp('q01-my-question', 's01', { text: '낮달은 왜 하얄까?' }),
  resp('q04-target', 's04', { date: '2026-09-28', region: '서울', lunarAge: 7.1, moonrise: '13:10', moonset: '23:40', sourceLabel: '앱 계산' }),
  resp('q04-plan', 's04', { reason: '20시에 떠 있다' }),
  resp('q06-explain-0', 's06', { text: '태양 반대편이라 밝은 면 전체가 보인다' }),
  resp('q08-first-revisit', 's08', { verdict: 'revise', newChoice: 'c', reason: '그림자는 반대쪽이었다' }),
  resp('q08-claim', 's08', { text: '보름달은 해 질 때 뜬다', verdict: 'keep', reason: '모형에서 확인' }),
  resp('q12-open-question', 's12', { text: '금환식은 왜 생길까?' }),
];

describe('2차시 모드 구성 (R8)', () => {
  it('짝 비교 카드는 01·09에만', () => {
    const pairs = flatScenes('2').filter((x) => x.scene.id.endsWith('-pair')).map((x) => x.scene.id);
    expect(pairs).toEqual(['s01-pair', 's09-pair']);
  });
  it('08은 미션 1개 + 학생 주장', () => {
    const s08 = scenesFor(STEPS.find((s) => s.id === 's08')!, '2').map((s) => s.id);
    expect(s08).toContain('s08-mission1');
    expect(s08).toContain('s08-claim');
    expect(s08).not.toContain('s08-mission2');
  });
  it('11 장면 C는 선택', () => {
    const c = scenesFor(STEPS.find((s) => s.id === 's11')!, '2').find((s) => s.id === 's11-c');
    expect(c?.optional).toBe(true);
  });
  it('3차시에는 11 장면 C가 필수이고 짝 비교가 더 많다', () => {
    const c = scenesFor(STEPS.find((s) => s.id === 's11')!, '3').find((s) => s.id === 's11-c');
    expect(c?.optional).toBe(false);
    expect(flatScenes('3').filter((x) => x.scene.id.endsWith('-pair')).length).toBeGreaterThan(2);
  });
  it('두 모드 모두 두 핵심 활동·일식·월식·보고서 장면을 포함', () => {
    for (const mode of ['2', '3'] as const) {
      const ids = flatScenes(mode).map((x) => x.scene.id);
      for (const must of ['s04-load', 's04-plan', 's06-restore', 's07-place', 's10-solar', 's10-lunar', 's12-write', 's12-submit']) expect(ids).toContain(must);
    }
  });
  it('권장 시간 합계는 차시당 45분 이내', () => {
    for (const mode of ['2', '3'] as const) {
      const total = STEPS.reduce((a, s) => a + s.minutes[mode], 0);
      expect(total).toBeLessThanOrEqual(mode === '3' ? 135 : 90);
    }
  });
});

describe('보고서 필수 항목 (R7·R11)', () => {
  it('2차시로 끝까지 진행하면 필수 3개가 모두 이전 응답으로 채워진다', () => {
    const b = bundle('2', { responses: PATH_RESPONSES, attempts: [attempt('s06', 's06-restore', 180), attempt('s07', 's07-place', 95)] });
    const sections = buildSections(b, undefined);
    const required = sections.filter((s) => s.required);
    expect(required.map((s) => s.id)).toEqual(['first-and-change', 'data', 'model']);
    for (const s of required) expect(s.imported.trim().length).toBeGreaterThan(0);
  });
  it('3차시는 필수 4개', () => {
    const sections = buildSections(bundle('3'), undefined);
    expect(sections.filter((s) => s.required).length).toBe(4);
  });
  it('자유 실험 기록은 모형 항목에 들어가지 않는다', () => {
    const b = bundle('2', { attempts: [attempt('s07', 's07-place', 90), attempt('sandbox', 'sandbox', 300, true)] });
    const model = buildSections(b, undefined).find((s) => s.id === 'model')!;
    expect(model.imported).toContain('3번 자리');
    expect(model.imported).not.toContain('8번 자리');
  });
  it('앱이 새 문장을 만들지 않는다: 응답이 없으면 비어 있다', () => {
    for (const s of buildSections(bundle('3'), undefined)) expect(s.imported).toBe('');
  });
  it('01 처음 생각은 first 값, 08 수정은 latest 값으로 이어진다', () => {
    const b = bundle('2', { responses: PATH_RESPONSES });
    const sec = buildSections(b, undefined).find((s) => s.id === 'first-and-change')!;
    expect(sec.imported).toContain('지구 그림자');
    expect(sec.imported).toContain('고침');
  });
  it('학생이 고친 문장은 다시 불러와도 유지된다', () => {
    const b = bundle('2', { responses: PATH_RESPONSES });
    const first = buildSections(b, undefined);
    const edited = first.map((s) => (s.id === 'data' ? { ...s, text: '내가 고친 한 문장' } : s));
    const again = buildSections(b, edited);
    expect(again.find((s) => s.id === 'data')!.text).toBe('내가 고친 한 문장');
  });
});

describe('진행 상태', () => {
  it('방문만 한 단계는 완료가 아니다', () => {
    const b = bundle('3', { progress: scenesFor(STEPS[0], '3').map((s) => ({ stepId: 's01', sceneId: s.id, status: 'visited' as const, updatedAt: '' })) });
    expect(stepStatus(b, STEPS[0])).toBe('visited');
  });
  it('선택 장면을 빼고 모두 완료하면 단계 완료', () => {
    const b = bundle('3', { progress: scenesFor(STEPS[0], '3').filter((s) => !s.optional).map((s) => ({ stepId: 's01', sceneId: s.id, status: 'completed' as const, updatedAt: '' })) });
    expect(stepStatus(b, STEPS[0])).toBe('completed');
  });
  it('이어 하기는 완료되지 않은 첫 장면으로', () => {
    const b = bundle('3', { progress: [{ stepId: 's01', sceneId: 's01-photos', status: 'completed', updatedAt: '' }] });
    expect(resumeTarget(b)).toEqual({ stepId: 's01', sceneId: 's01-question' });
  });
  it('차시의 마지막 장면 다음은 차시 마무리 화면', () => {
    const last = scenesFor(STEPS.find((s) => s.id === 's04')!, '3').at(-1)!;
    expect(nextTarget('3', 's04', last.id)).toEqual({ kind: 'period-outro', period: 1 });
    const last2 = scenesFor(STEPS.find((s) => s.id === 's06')!, '2').at(-1)!;
    expect(nextTarget('2', 's06', last2.id)).toEqual({ kind: 'period-outro', period: 1 });
  });
});
