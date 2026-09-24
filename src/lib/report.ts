import type { ReportSection, StudentBundle } from '@shared/types';
import { SOURCE_LABEL } from '@shared/types';
import { PHASE_LABEL_KO, phaseName } from '@shared/phaseMath';
import { QID } from '@shared/questionIds';
import { litWordsAt, positionNo } from '@/lib/words';

/** 01 첫 생각 선택지 — 01, 08, 12, 교사 화면이 같은 문장을 쓴다 */
export const Q01_CHOICES = [
  { id: 'a', label: '지구 그림자가 날마다 달을 다르게 가려서' },
  { id: 'b', label: '달에서 빛나는 부분이 날마다 바뀌어서' },
  { id: 'c', label: '햇빛을 받는 부분 중에서 지구에서 보이는 부분이 달라져서' },
  { id: 'd', label: '아직 모르겠다' },
];

export const Q01_OPTIONS: Record<string, string> = Object.fromEntries(Q01_CHOICES.map((c) => [c.id, c.label]));

export interface SectionDef {
  id: string;
  title: string;
  requiredIn: ('3' | '2')[];
  hint: string;
}

export const SECTION_DEFS: SectionDef[] = [
  { id: 'first-and-change', title: '처음 생각과 바뀐 점', requiredIn: ['3', '2'], hint: '1단계에서 고른 첫 생각과, 8단계에서 그 생각을 그대로 두었는지 고쳤는지가 들어와요.' },
  { id: 'data', title: '내가 고른 자료와 값', requiredIn: ['3', '2'], hint: '4단계에서 고른 날짜와 월령, 달이 뜨고 지는 시각이 들어와요.' },
  { id: 'model', title: '내 모형: 우주에서 본 모습과 지구에서 본 모습', requiredIn: ['3', '2'], hint: '6·7단계에서 제출한 모형과 내가 쓴 설명이 들어와요.' },
  { id: 'phase-vs-eclipse', title: '달 모양이 바뀌는 것과 월식이 다른 까닭', requiredIn: ['3'], hint: '9·10단계에서 쓴 답이 들어와요.' },
  { id: 'eclipse-conditions', title: '일식·월식이 일어나는 모습과 매달 일어나지 않는 까닭', requiredIn: [], hint: '10단계 비교표와 11단계 설명이 들어와요.' },
  { id: 'observation', title: '내가 본 달, 또는 사진에서 본 것', requiredIn: [], hint: '3단계 관측 카드가 들어와요.' },
  { id: 'wonder', title: '아직 궁금한 점', requiredIn: [], hint: '1단계에서 쓴 ‘내가 궁금한 것’도 옆에 다시 보여 줘요.' },
];

function text(bundle: StudentBundle, qid: string): string {
  const v = bundle.responses.find((r) => r.questionId === qid)?.latest as { text?: string } | undefined;
  return v?.text?.trim() ?? '';
}
function choice(bundle: StudentBundle, qid: string, first = false): string | undefined {
  const r = bundle.responses.find((x) => x.questionId === qid);
  const v = (first ? r?.first : r?.latest) as { choice?: string } | undefined;
  return v?.choice;
}

/** 모형 기록 한 줄(사실 기록). 학생 결론이 아니라 조작한 상태를 적는다. */
export function modelLine(theta: number): string {
  return `달을 ${positionNo(theta)}번 자리 근처에 놓았어요. 지구에서는 ${litWordsAt(theta)}. (${PHASE_LABEL_KO[phaseName(theta)]})`;
}

/** 이전 단계의 학생 응답을 그대로 불러온다. 앱이 새 문장을 만들지 않는다(R7). */
export function importSection(bundle: StudentBundle, id: string): { imported: string; refs: ReportSection['refs'] } {
  const refs: ReportSection['refs'] = [];
  switch (id) {
    case 'first-and-change': {
      const first = choice(bundle, QID.q01Choice, true);
      const reason = text(bundle, QID.q01Reason);
      const rv = bundle.responses.find((r) => r.questionId === QID.q08FirstRevisit)?.latest as { verdict?: string; reason?: string; newChoice?: string } | undefined;
      const lines = [];
      if (first) lines.push(`처음 생각: ${Q01_OPTIONS[first] ?? first}${reason ? ` — ${reason}` : ''}`);
      if (rv?.verdict) lines.push(`${rv.verdict === 'keep' ? '그대로 둠' : '고침'}${rv.newChoice ? ` → ${Q01_OPTIONS[rv.newChoice] ?? rv.newChoice}` : ''}${rv.reason ? `: ${rv.reason}` : ''}`);
      refs.push({ kind: 'response', id: QID.q01Choice, label: '1단계 첫 생각' }, { kind: 'response', id: QID.q08FirstRevisit, label: '8단계 다시 보기' });
      return { imported: lines.join('\n'), refs };
    }
    case 'data': {
      const t = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; region?: string; lunarAge?: number | null; moonrise?: string | null; moonset?: string | null; sourceLabel?: string } | undefined;
      const plan = bundle.responses.find((r) => r.questionId === 'q04-plan')?.latest as { reason?: string } | undefined;
      const lines = [];
      if (t?.date) lines.push(`${t.region ?? ''} ${t.date} · 월령 ${t.lunarAge ?? '자료 없음'} · 달 뜨는 시각 ${t.moonrise ?? '없음'} · 달 지는 시각 ${t.moonset ?? '없음'} (${t.sourceLabel ?? ''})`);
      if (plan?.reason) lines.push(`관측 계획의 근거: ${plan.reason}`);
      const snap = bundle.snapshots.find((s) => s.id.startsWith('month:'));
      if (snap) refs.push({ kind: 'snapshot', id: snap.id, label: `${snap.isExample ? SOURCE_LABEL['app-calculation'] : SOURCE_LABEL['institution-forecast']} · ${snap.fetchedAt.slice(0, 10)}` });
      refs.push({ kind: 'response', id: 'q04-target', label: '4단계 목표 카드' });
      return { imported: lines.join('\n'), refs };
    }
    case 'model': {
      const a = [...bundle.attempts].reverse().find((x) => x.submitted && !x.isSandbox && (x.stepId === 's07' || x.stepId === 's06'));
      const explain = text(bundle, 'q06-explain-0') || text(bundle, 'q07-fact-model');
      const lines = [];
      if (a) {
        lines.push(modelLine(a.state.theta));
        refs.push({ kind: 'attempt', id: a.id, label: `${a.stepId === 's07' ? '7' : '6'}단계 모형` });
      }
      if (explain) lines.push(explain);
      return { imported: lines.join('\n'), refs };
    }
    case 'phase-vs-eclipse': {
      const lines = [text(bundle, 'q10-lunar-explain'), text(bundle, 'q09-why')].filter(Boolean);
      refs.push({ kind: 'response', id: 'q10-lunar-explain', label: '10단계 월식 설명' });
      return { imported: lines.join('\n'), refs };
    }
    case 'eclipse-conditions': {
      const lines = [text(bundle, 'q10-solar-explain'), text(bundle, 'q11-explain')].filter(Boolean);
      refs.push({ kind: 'response', id: 'q11-explain', label: '11단계 설명' });
      return { imported: lines.join('\n'), refs };
    }
    case 'observation': {
      const o = bundle.observations[bundle.observations.length - 1];
      if (!o) return { imported: '', refs };
      const asset = o.mediaAssetId ? bundle.mediaAssets.find((m) => m.id === o.mediaAssetId) : null;
      const lines = [`${SOURCE_LABEL[o.sourceType]} · ${o.date || '날짜 모름'} ${o.timeKnown && o.time ? o.time : '(시각 모름)'} · ${o.region}`, o.brightDescription];
      if (asset) lines.push(`사진: ${asset.title} — 찍은 사람 ${asset.credit || asset.photographer || '알 수 없음'}`);
      refs.push({ kind: 'observation', id: o.id, label: '3단계 관측 카드' });
      return { imported: lines.filter(Boolean).join('\n'), refs };
    }
    case 'wonder': {
      return { imported: text(bundle, 'q12-open-question'), refs: [{ kind: 'response', id: QID.q01MyQuestion, label: '1단계 내가 궁금한 것' }] };
    }
    default:
      return { imported: '', refs };
  }
}

export function buildSections(bundle: StudentBundle, existing: ReportSection[] | undefined): ReportSection[] {
  const mode = bundle.classSession.mode;
  return SECTION_DEFS.map((def) => {
    const imp = importSection(bundle, def.id);
    const prev = existing?.find((s) => s.id === def.id);
    return {
      id: def.id,
      required: def.requiredIn.includes(mode),
      imported: imp.imported,
      text: prev && prev.text !== prev.imported ? prev.text : imp.imported,
      kept: prev?.kept ?? false,
      refs: imp.refs,
    };
  });
}
