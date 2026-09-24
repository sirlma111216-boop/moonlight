import { useEffect, useState } from 'react';
import type { Observation, SourceType } from '@shared/types';
import { SOURCE_EXPLAIN } from '@shared/types';
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
      <p className="lead">두 가지 길 중 하나를 골라요. 어느 길을 골라도 뒤에서 똑같은 활동을 해요. 달을 직접 보지 못했어도 괜찮아요.</p>
      <div className="grid-2">
        <button type="button" className="choice" aria-pressed={chosen === 'mine'} onClick={() => respond('q03-path', STEP, 's03-choose', { choice: 'mine' })} style={{ minHeight: 120, alignItems: 'center' }}>
          <div>
            <SourceBadge type="my-observation" />
            <h3 style={{ margin: '8px 0 4px' }}>내가 본 달 기록하기</h3>
            <p className="caption" style={{ margin: 0 }}>수업 전이나 수업 사이에 본 달을 그리고, 어떻게 보였는지 글로 써요. 밤에 일부러 나가지 않아도 돼요.</p>
          </div>
        </button>
        <button type="button" className="choice" aria-pressed={chosen === 'provided'} onClick={() => respond('q03-path', STEP, 's03-choose', { choice: 'provided' })} style={{ minHeight: 120, alignItems: 'center' }}>
          <div>
            <SourceBadge type="provided-observation" />
            <h3 style={{ margin: '8px 0 4px' }}>선생님이 준 사진으로 하기</h3>
            <p className="caption" style={{ margin: 0 }}>언제 어디서 찍었는지 알려진 진짜 달 사진 중에서 한 장을 골라요. ‘내가 본 달’로 적히지는 않아요.</p>
          </div>
        </button>
      </div>
      <p className="caption">달을 보지 못한 까닭은 쓰지 않아도 돼요.</p>
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
        <span className="caption">{path === 'mine' ? '내가 본 달을 기록해요.' : '선생님이 준 사진을 골라 살펴봐요.'}</span>
      </div>
      {path === 'provided' ? (
        <div className="stack-sm">
          {assets.length === 0 ? <p className="note note--warn">선생님이 사진을 준비하고 있어요. 사진이 올라오면 여기서 고를 수 있어요. 지금은 다른 단계를 먼저 해도 돼요.</p> : null}
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
            <label htmlFor="obs-date">날짜 {path === 'provided' ? '(사진을 찍은 날 · 모르면 비워 두세요)' : ''}</label>
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
            <span className="micro">시각을 모르면 ‘모름’에 표시해 두세요. 아무 시각이나 적지 않아요.</span>
          </div>
          <div className="field">
            <label htmlFor="obs-region">가까운 도시</label>
            <select id="obs-region" className="select" value={form.region} onChange={(e) => set({ region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="micro">집 주소는 쓰지 않아요.</span>
          </div>
          <div className="field">
            <label htmlFor="obs-desc">밝은 부분은 어떻게 보였나요? (어느 쪽이, 얼마나)</label>
            <textarea id="obs-desc" className="textarea" value={form.brightDescription} onChange={(e) => set({ brightDescription: e.target.value })} placeholder="예: 오른쪽이 반보다 조금 더 밝았고 왼쪽은 어두웠다" />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="obs-dir">어느 쪽 하늘에 있었나요? (안 써도 돼요)</label>
              <input id="obs-dir" className="input" value={form.direction ?? ''} onChange={(e) => set({ direction: e.target.value || null })} placeholder="예: 해가 지는 쪽 하늘" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="obs-weather">날씨 (안 써도 돼요)</label>
              <input id="obs-weather" className="input" value={form.weather ?? ''} onChange={(e) => set({ weather: e.target.value || null })} placeholder="예: 구름 조금" />
            </div>
          </div>
          <div className="field">
            <span className="label">내가 쓴 내용이 얼마나 확실한가요?</span>
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
              <span className="label">달 그리기: 동그라미 안에서 밝게 보인 부분을 칠하세요. 잘 그렸는지 점수를 매기지 않아요.</span>
              <MoonDrawCanvas value={form.drawingDataUrl ?? null} onChange={(d) => set({ drawingDataUrl: d })} />
              {photoEnabled ? (
                <div className="field">
                  <label htmlFor="obs-photo">사진 올리기 (안 해도 돼요 · 얼굴이나 이름이 나오지 않게 찍어 주세요)</label>
                  <input id="obs-photo" type="file" accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
                  <span className="micro">사진 속 위치 정보는 올릴 때 지워져요.</span>
                  {form.photoKey ? <span className="micro">사진을 저장했어요.</span> : null}
                  {uploadErr ? <span className="note note--error">{uploadErr}</span> : null}
                </div>
              ) : null}
            </>
          ) : form.mediaAssetId ? (
            <MediaPhoto asset={assets.find((a) => a.id === form.mediaAssetId)} />
          ) : (
            <p className="caption">위에서 사진을 한 장 골라 주세요.</p>
          )}
          <p className="micro">사진을 찍은 방향에 따라 달이 조금 돌아가 보일 수 있어요. 그래서 왼쪽·오른쪽만으로 맞고 틀림을 정하지 않아요.</p>
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
        {!canSave ? <span className="caption">{path === 'mine' ? '달을 그리고 밝은 부분을 글로 쓰면 저장할 수 있어요.' : '사진을 고르고 밝은 부분을 글로 쓰면 저장할 수 있어요.'}</span> : null}
      </div>
    </div>
  );
}

function Sources() {
  useScene(STEP, 's03-sources');
  useAutoComplete(STEP, 's03-sources', ['q03-source-check']);
  const bundle = useSession((s) => s.bundle)!;
  const path = (bundle.responses.find((r) => r.questionId === 'q03-path')?.latest as { choice?: string } | undefined)?.choice ?? 'mine';
  const order: SourceType[] = ['my-observation', 'provided-observation', 'institution-forecast', 'app-calculation', 'learning-model'];
  return (
    <div className="stack">
      <p className="lead">이 앱의 자료에는 어디서 온 자료인지 알려 주는 이름표가 붙어 있어요. 이름표를 알아 두면 보고서에 근거를 정확히 쓸 수 있어요.</p>
      <div className="stack-sm">
        {order.map((k) => (
          <div key={k} className="row" style={{ alignItems: 'flex-start' }}>
            <SourceBadge type={k} />
            <span className="caption">{SOURCE_EXPLAIN[k]}</span>
          </div>
        ))}
      </div>
      <ChoiceQuestion
        qid="q03-source-check"
        stepId={STEP}
        sceneId="s03-sources"
        prompt="내가 방금 만든 관측 카드에는 어떤 이름표가 붙을까요?"
        options={[
          { id: 'my-observation', label: '내가 본 달', correct: path === 'mine', feedback: path === 'mine' ? '맞아요. 내가 그린 달은 7단계에서 모형과 나란히 놓고 비교해요.' : '이번에는 선생님이 준 사진을 골랐어요. 그래서 ‘내가 본 달’로 적히지 않아요.' },
          { id: 'provided-observation', label: '선생님이 준 실제 사진', correct: path === 'provided', feedback: path === 'provided' ? '맞아요. 내가 본 달은 아니지만, 뒤의 활동은 똑같이 할 수 있어요.' : '이번에는 내가 직접 본 달을 그렸어요.' },
          { id: 'institution-forecast', label: '천문연구원 자료', correct: false, feedback: '천문연구원 자료는 4단계에서 가져오는 월령과 달 뜨는 시각이에요. 관측 카드는 내가 보거나 고른 달이에요.' },
          { id: 'learning-model', label: '모형', correct: false, feedback: '모형은 5단계부터 움직여 보는 3D 달이에요.' },
        ]}
      />
      <p className="caption">컴퓨터로 만든 그림은 진짜 사진처럼 보여도 ‘실제 사진’으로 쓰지 않아요.</p>
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
