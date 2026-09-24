import type { ReportSection, StudentBundle } from '@shared/types';
import { SOURCE_LABEL } from '@shared/types';
import { illuminatedFraction, PHASE_LABEL_KO, phaseName } from '@shared/phaseMath';
import { QID } from '@shared/questionIds';

export const Q01_OPTIONS: Record<string, string> = {
  a: '지구 그림자가 매일 달을 다르게 가려서',
  b: '달에서 빛나는 부분이 매일 바뀌어서',
  c: '태양빛을 받는 부분 중 지구에서 보이는 부분이 달라져서',
  d: '아직 모르겠다',
};

export interface SectionDef {
  id: string;
  title: string;
  requiredIn: ('3' | '2')[];
  hint: string;
}

export const SECTION_DEFS: SectionDef[] = [
  { id: 'first-and-change', title: '처음 생각과 바뀐 점', requiredIn: ['3', '2'], hint: '01의 첫 생각과 08에서 유지/수정한 이유가 자동으로 들어와요.' },
  { id: 'data', title: '내가 고른 자료와 값', requiredIn: ['3', '2'], hint: '04에서 고른 날짜·지역·월령·출몰 값과 출처가 들어와요.' },
  { id: 'model', title: '내 모형 두 시점과 설명', requiredIn: ['3', '2'], hint: '06~07에서 제출한 모형의 우주 시점·지구 시점 그림과 내 설명이 들어와요.' },
  { id: 'phase-vs-eclipse', title: '위상 변화와 월식이 다른 이유', requiredIn: ['3'], hint: '09~10의 답이 들어와요.' },
  { id: 'eclipse-conditions', title: '일식·월식의 배치와 매달 일어나지 않는 이유', requiredIn: [], hint: '10의 비교표와 11의 설명이 들어와요.' },
  { id: 'observation', title: '실제 관측 또는 제공 자료의 출처와 관찰 내용', requiredIn: [], hint: '03의 관측 카드가 들어와요.' },
  { id: 'wonder', title: '아직 궁금한 점', requiredIn: [], hint: '01에서 쓴 내 질문이 옆에 다시 보여요.' },
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
      if (rv?.verdict) lines.push(`${rv.verdict === 'keep' ? '유지' : '수정'}${rv.newChoice ? ` → ${Q01_OPTIONS[rv.newChoice] ?? rv.newChoice}` : ''}${rv.reason ? `: ${rv.reason}` : ''}`);
      refs.push({ kind: 'response', id: QID.q01Choice, label: '01 첫 생각' }, { kind: 'response', id: QID.q08FirstRevisit, label: '08 유지/수정' });
      return { imported: lines.join('\n'), refs };
    }
    case 'data': {
      const t = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; region?: string; lunarAge?: number | null; moonrise?: string | null; moonset?: string | null; sourceLabel?: string } | undefined;
      const plan = bundle.responses.find((r) => r.questionId === 'q04-plan')?.latest as { reason?: string } | undefined;
      const lines = [];
      if (t?.date) lines.push(`${t.region ?? ''} ${t.date} · 월령 ${t.lunarAge ?? '결측'} · 월출 ${t.moonrise ?? '없음'} · 월몰 ${t.moonset ?? '없음'} (${t.sourceLabel ?? ''})`);
      if (plan?.reason) lines.push(`관측 계획 근거: ${plan.reason}`);
      const snap = bundle.snapshots.find((s) => s.id.startsWith('month:'));
      if (snap) refs.push({ kind: 'snapshot', id: snap.id, label: `${snap.provider} · ${snap.fetchedAt.slice(0, 16)}` });
      refs.push({ kind: 'response', id: 'q04-target', label: '04 목표 카드' });
      return { imported: lines.join('\n'), refs };
    }
    case 'model': {
      const a = [...bundle.attempts].reverse().find((x) => x.submitted && !x.isSandbox && (x.stepId === 's07' || x.stepId === 's06'));
      const explain = text(bundle, 'q06-explain-0') || text(bundle, 'q07-fact-model');
      const lines = [];
      if (a) {
        lines.push(`모형 각도 ${Math.round(a.state.theta)}° (${PHASE_LABEL_KO[phaseName(a.state.theta)]}, 원반 밝은 비율 ${Math.round(illuminatedFraction(a.state.theta) * 100)}%)`);
        refs.push({ kind: 'attempt', id: a.id, label: `${a.stepId} 모형 제출` });
      }
      if (explain) lines.push(explain);
      return { imported: lines.join('\n'), refs };
    }
    case 'phase-vs-eclipse': {
      const lines = [text(bundle, 'q10-lunar-explain'), text(bundle, 'q09-why')].filter(Boolean);
      refs.push({ kind: 'response', id: 'q10-lunar-explain', label: '10 월식 설명' });
      return { imported: lines.join('\n'), refs };
    }
    case 'eclipse-conditions': {
      const lines = [text(bundle, 'q10-solar-explain'), text(bundle, 'q11-explain')].filter(Boolean);
      refs.push({ kind: 'response', id: 'q11-explain', label: '11 이유 설명' });
      return { imported: lines.join('\n'), refs };
    }
    case 'observation': {
      const o = bundle.observations[bundle.observations.length - 1];
      if (!o) return { imported: '', refs };
      const asset = o.mediaAssetId ? bundle.mediaAssets.find((m) => m.id === o.mediaAssetId) : null;
      const lines = [`${SOURCE_LABEL[o.sourceType]} · ${o.date || '날짜 미상'} ${o.timeKnown && o.time ? o.time : '(시각 모름)'} · ${o.region}`, o.brightDescription];
      if (asset) lines.push(`자료: ${asset.title} — ${asset.credit || asset.photographer || '출처 미기재'}`);
      refs.push({ kind: 'observation', id: o.id, label: '03 관측 카드' });
      return { imported: lines.filter(Boolean).join('\n'), refs };
    }
    case 'wonder': {
      return { imported: text(bundle, 'q12-open-question'), refs: [{ kind: 'response', id: QID.q01MyQuestion, label: '01 내 질문' }] };
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
