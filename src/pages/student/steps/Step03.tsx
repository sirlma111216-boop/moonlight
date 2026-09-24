import { useEffect, useState } from 'react';
import type { Observation } from '@shared/types';
import { SOURCE_LABEL } from '@shared/types';
import { REGIONS } from '@shared/regions';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion } from '@/components/questions';
import { MoonDrawCanvas } from '@/components/MoonDrawCanvas';
import { MediaPhoto } from '@/components/MediaPhoto';
import { SourceBadge } from '@/components/SourceBadge';
import { todayKST } from '@/lib/publicdata';
import { api } from '@/lib/api';

const STEP = 's03';

function Choose() {
  useScene(STEP, 's03-choose');
  useAutoComplete(STEP, 's03-choose', ['q03-path']);
  const rec = useSession((s) => s.getResponse('q03-path'));
  const respond = useSession((s) => s.respond);
  const chosen = (rec?.latest as { choice?: string } | undefined)?.choice;
  return (
    <div className="stack">
      <p className="lead">두 갈래 길 중 하나를 고르세요. 어느 길이든 같은 비교·모형 활동을 해요. 관측을 못 했다고 불이익은 없어요.</p>
      <div className="grid-2">
        <button type="button" className="choice" aria-pressed={chosen === 'mine'} onClick={() => respond('q03-path', STEP, 's03-choose', { choice: 'mine' })} style={{ minHeight: 120, alignItems: 'center' }}>
          <div>
            <SourceBadge type="my-observation" />
            <h3 style={{ margin: '8px 0 4px' }}>내가 관측한 달</h3>
            <p className="caption" style={{ margin: 0 }}>수업 전이나 차시 사이에 본 달을 그리고 말로 묘사해요. 야간 외출은 필수가 아니에요.</p>
          </div>
        </button>
        <button type="button" className="choice" aria-pressed={chosen === 'provided'} onClick={() => respond('q03-path', STEP, 's03-choose', { choice: 'provided' })} style={{ minHeight: 120, alignItems: 'center' }}>
          <div>
            <SourceBadge type="provided-observation" />
            <h3 style={{ margin: '8px 0 4px' }}>제공된 관측 자료로 탐구</h3>
            <p className="caption" style={{ margin: 0 }}>출처·날짜가 확인된 실제 관측 사진 묶음에서 한 장을 골라요. 내 관측이라고 표시되지 않아요.</p>
          </div>
        </button>
      </div>
      <p className="caption">직접 관측하지 못한 이유를 쓸 필요는 없어요. 달의 한 주기 전체를 며칠 안에 관측했다고 구성하지도 않아요.</p>
    </div>
  );
}

function CardScene() {
  const { complete } = useScene(STEP, 's03-card');
  const bundle = useSession((s) => s.bundle)!;
  const saveObservation = useSession((s) => s.saveObservation);
  const path = (bundle.responses.find((r) => r.questionId === 'q03-path')?.latest as { choice?: string } | undefined)?.choice ?? 'mine';
  const existing = [...bundle.observations].reverse().find((o) => (path === 'mine' ? o.sourceType === 'my-observation' : o.sourceType === 'provided-observation'));
  const photoEnabled = bundle.classSession.settings.photoUploadEnabled;
  const assets = bundle.mediaAssets.filter((a) => a.kind === 'real' && a.category === 'phase' && a.src);
  const [form, setForm] = useState<Omit<Observation, 'createdAt'>>(
    existing ?? {
      id: `obs-${Date.now().toString(36)}`,
      sourceType: path === 'mine' ? 'my-observation' : 'provided-observation',
      mediaAssetId: null,
      date: path === 'mine' ? todayKST() : '',
      time: null,
      timeKnown: false,
      region: bundle.classSession.region,
      drawingDataUrl: null,
      brightDescription: '',
      direction: null,
      weather: null,
      confidence: 'mid',
      photoKey: null,
    },
  );
  const [saved, setSaved] = useState(Boolean(existing));
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  useEffect(() => {
    if (existing) complete();
  }, [existing, complete]);

  const set = (patch: Partial<Observation>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };
  const canSave = form.brightDescription.trim().length > 0 && (path === 'mine' ? Boolean(form.drawingDataUrl) : Boolean(form.mediaAssetId));

  async function upload(file: File) {
    setUploading(true);
    setUploadErr(null);
    try {
      const r = await api<{ key: string }>('/api/student/photo', { method: 'POST', raw: file, headers: { 'content-type': file.type } });
      set({ photoKey: r.key });
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <SourceBadge type={form.sourceType} />
        <span className="caption">{path === 'mine' ? '내가 본 달을 기록해요.' : '제공된 실제 관측 자료를 골라 읽어요.'}</span>
      </div>
      {path === 'provided' ? (
        <div className="stack-sm">
          {assets.length === 0 ? <p className="note note--warn">교사가 자료를 준비 중입니다. 자료가 등록되면 여기서 고를 수 있어요. 지금은 다른 단계를 진행해도 돼요.</p> : null}
          <div className="grid-3">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                className="choice"
                aria-pressed={form.mediaAssetId === a.id}
                onClick={() => {
                  const d = a.takenAt ? a.takenAt.slice(0, 10) : '';
                  const t = a.takenAt && a.takenAt.length >= 16 ? a.takenAt.slice(11, 16) : null;
                  set({ mediaAssetId: a.id, date: d, time: t, timeKnown: Boolean(t), region: a.region ?? form.region });
                }}
                style={{ display: 'block' }}
              >
                <MediaPhoto asset={a} compact />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-sm">
          <div className="field">
            <label htmlFor="obs-date">날짜 {path === 'provided' ? '(자료의 촬영일 · 모르면 비워 두기)' : ''}</label>
            <input id="obs-date" type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="field">
            <span className="label">시각</span>
            <div className="row">
              <input type="time" className="input" style={{ width: 'auto' }} value={form.time ?? ''} disabled={!form.timeKnown} onChange={(e) => set({ time: e.target.value || null })} aria-label="시각" />
              <label className="row" style={{ gap: 6 }}>
                <input type="checkbox" checked={!form.timeKnown} onChange={(e) => set({ timeKnown: !e.target.checked, time: e.target.checked ? null : form.time })} /> 모름
              </label>
            </div>
            <span className="micro">모르면 ‘모름’을 두세요. 임의의 시각을 채우지 않아요.</span>
          </div>
          <div className="field">
            <label htmlFor="obs-region">지역 (정확한 주소나 GPS 는 받지 않아요)</label>
            <select id="obs-region" className="select" value={form.region} onChange={(e) => set({ region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="obs-desc">밝은 부분 묘사 (어느 쪽이, 얼마나 밝았나요?)</label>
            <textarea id="obs-desc" className="textarea" value={form.brightDescription} onChange={(e) => set({ brightDescription: e.target.value })} placeholder="예: 오른쪽이 반 조금 넘게 밝았고 왼쪽은 어두웠다" />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="obs-dir">보인 방향 (선택)</label>
              <input id="obs-dir" className="input" value={form.direction ?? ''} onChange={(e) => set({ direction: e.target.value || null })} placeholder="예: 남서쪽 하늘" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="obs-weather">날씨 메모 (선택)</label>
              <input id="obs-weather" className="input" value={form.weather ?? ''} onChange={(e) => set({ weather: e.target.value || null })} placeholder="예: 구름 조금" />
            </div>
          </div>
          <div className="field">
            <span className="label">확신 정도</span>
            <div className="row">
              {(['low', 'mid', 'high'] as const).map((c) => (
                <button key={c} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={form.confidence === c} onClick={() => set({ confidence: c })}>
                  {c === 'low' ? '잘 모르겠다' : c === 'mid' ? '어느 정도' : '확실하다'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="stack-sm">
          {path === 'mine' ? (
            <>
              <span className="label">달 그리기 — 원 안에서 밝게 보인 부분을 칠하세요 (자동 채점하지 않아요)</span>
              <MoonDrawCanvas value={form.drawingDataUrl ?? null} onChange={(d) => set({ drawingDataUrl: d })} />
              {photoEnabled ? (
                <div className="field">
                  <label htmlFor="obs-photo">사진 올리기 (선택 · JPEG/PNG · 위치 정보는 제거돼요 · 얼굴이나 이름이 나오지 않게)</label>
                  <input id="obs-photo" type="file" accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
                  {form.photoKey ? <span className="micro">사진 저장됨</span> : null}
                  {uploadErr ? <span className="note note--error">{uploadErr}</span> : null}
                </div>
              ) : null}
            </>
          ) : form.mediaAssetId ? (
            <MediaPhoto asset={assets.find((a) => a.id === form.mediaAssetId)} />
          ) : (
            <p className="caption">왼쪽 위에서 자료 한 장을 고르세요.</p>
          )}
          <p className="micro">사진 촬영 방향과 회전이 달라질 수 있어요. 좌우 모양만으로 판단을 확정하지 않아요.</p>
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={!canSave}
          onClick={async () => {
            await saveObservation(form);
            setSaved(true);
            complete();
          }}
        >
          관측 카드 저장
        </button>
        {saved ? <span className="chip chip--green">저장됨</span> : null}
        {!canSave ? <span className="caption">{path === 'mine' ? '달을 그리고 밝은 부분을 묘사하면 저장할 수 있어요.' : '자료를 고르고 밝은 부분을 묘사하면 저장할 수 있어요.'}</span> : null}
      </div>
    </div>
  );
}

function Sources() {
  useScene(STEP, 's03-sources');
  useAutoComplete(STEP, 's03-sources', ['q03-source-check']);
  const bundle = useSession((s) => s.bundle)!;
  const path = (bundle.responses.find((r) => r.questionId === 'q03-path')?.latest as { choice?: string } | undefined)?.choice ?? 'mine';
  return (
    <div className="stack">
      <p className="lead">이 앱은 자료의 출처를 늘 배지로 구분해요. 어떤 자료가 어떤 배지인지 알아 두면 보고서에서 근거를 정확히 쓸 수 있어요.</p>
      <div className="stack-sm">
        {(Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]).map((k) => (
          <div key={k} className="row" style={{ alignItems: 'flex-start' }}>
            <SourceBadge type={k} />
            <span className="caption">
              {{
                'my-observation': '내가 직접 보고 그린 기록.',
                'provided-observation': '교사·기관이 제공한, 출처와 날짜가 확인된 실제 사진.',
                'institution-forecast': '한국천문연구원 등 기관이 계산해 제공한 예측값(월령·출몰 시각).',
                'app-calculation': '이 앱이 천문 계산 라이브러리로 구한 값. 기관 자료가 아니에요.',
                'learning-model': '설명을 위해 단순화한 3D 모형. 축척이 실제와 달라요.',
              }[k]}
            </span>
          </div>
        ))}
      </div>
      <ChoiceQuestion
        qid="q03-source-check"
        stepId={STEP}
        sceneId="s03-sources"
        prompt="내가 03에서 만든 관측 카드의 출처 유형은 무엇인가요?"
        options={[
          { id: 'my-observation', label: '나의 관측', correct: path === 'mine', feedback: path === 'mine' ? '내가 그린 달은 07에서 ‘나의 관측(그림)’ 배지를 달고 모형과 비교해요.' : '이번에 고른 길은 제공된 자료였어요. 내 관측으로 표시되지 않아요.' },
          { id: 'provided-observation', label: '제공된 실제 관측', correct: path === 'provided', feedback: path === 'provided' ? '제공 자료는 내 관측이라고 표시되지 않지만 같은 비교·모형 활동에 쓸 수 있어요.' : '이번에는 내가 직접 그린 관측이었어요.' },
          { id: 'institution-forecast', label: '기관 예측 자료', correct: false, feedback: '기관 자료는 04단계에서 가져오는 월령·출몰 시각이에요. 관측 카드는 관측 기록이에요.' },
          { id: 'learning-model', label: '학습 모형', correct: false, feedback: '학습 모형은 05단계부터 움직이는 3D 모형이에요.' },
        ]}
      />
      <p className="caption">생성 이미지는 실제 관측 자료로 쓸 수 없어요. 시뮬레이션 렌더도 ‘실사진’이 아니라 ‘시뮬레이션’으로만 표시돼요.</p>
    </div>
  );
}

export default function Step03({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's03-choose':
      return <Choose />;
    case 's03-card':
      return <CardScene />;
    case 's03-sources':
      return <Sources />;
    default:
      return null;
  }
}
