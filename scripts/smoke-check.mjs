import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'https://moonlight.sirlma.workers.dev';
const KEY = readFileSync(process.argv[3], 'utf8').trim();
const ORIGIN = BASE;

function jar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    take(res) {
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [kv] = c.split(';');
        const i = kv.indexOf('=');
        cookies.set(kv.slice(0, i), kv.slice(i + 1));
      }
    },
  };
}

async function call(j, method, path, body, { csrf = true, origin = ORIGIN } = {}) {
  const headers = { cookie: j.header() };
  if (csrf) headers['x-requested-with'] = 'moonlight';
  if (origin) headers.origin = origin;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  j.take(res);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const T = jar();
let r = await call(T, 'POST', '/api/teacher/login', { mode: 'key', key: KEY });
check('교사 접근 키 로그인', r.status === 200, r.status);
r = await call(T, 'POST', '/api/teacher/classes', { title: '자동 점검용 임시 수업', mode: '2', region: '서울' });
const cls = r.data;
check('수업 생성', r.status === 200 && /^[A-Z0-9]{6}$/.test(cls.code), cls.code);

const A = jar();
const B = jar();
r = await call(A, 'POST', '/api/student/join', { code: cls.code });
check('학생 A 코드 입장(이름 없음)', r.status === 200 && r.data.participant?.tag?.startsWith('달-'), r.data.participant?.tag);
const aTag = r.data.participant.tag;
const aId = r.data.participant.id;
r = await call(B, 'POST', '/api/student/join', { code: cls.code });
check('학생 B 코드 입장', r.status === 200);

r = await call(A, 'POST', '/api/student/responses', { questionId: 'q01-choice', stepId: 's01', sceneId: 's01-question', value: { choice: 'a', correct: null } });
check('A 응답 저장', r.status === 200);
r = await call(A, 'POST', '/api/student/responses', { questionId: 'q01-choice', stepId: 's01', sceneId: 's01-question', value: { choice: 'c', correct: null } });
check('A 응답 수정 시 처음 생각 보존', r.status === 200 && r.data.first?.choice === 'a' && r.data.latest?.choice === 'c', JSON.stringify({ first: r.data.first, latest: r.data.latest }));
await call(A, 'POST', '/api/student/responses', { questionId: 'q08-claim', stepId: 's08', sceneId: 's08-claim', value: { text: '비밀 서술 문장', verdict: 'keep', reason: '이유' } });
await call(B, 'POST', '/api/student/responses', { questionId: 'q01-choice', stepId: 's01', sceneId: 's01-question', value: { choice: 'b', correct: null } });

r = await call(B, 'GET', '/api/student/me');
const bSeesA = JSON.stringify(r.data).includes(aId) || r.data.responses.some((x) => x.latest?.choice === 'c');
check('B 는 A 의 기록을 볼 수 없음', r.status === 200 && !bSeesA);

r = await call(A, 'GET', '/api/teacher/classes');
check('학생 세션으로 교사 API 접근 불가', r.status === 401, r.status);

r = await call(A, 'POST', '/api/student/responses', { questionId: 'x', stepId: 's01', sceneId: 's01-question', value: 1 }, { csrf: false });
check('CSRF 헤더 없는 변경 요청 거부', r.status === 403, r.status);
r = await call(A, 'POST', '/api/student/responses', { questionId: 'x', stepId: 's01', sceneId: 's01-question', value: 1 }, { origin: 'https://evil.example' });
check('다른 출처 변경 요청 거부', r.status === 403, r.status);

r = await call(A, 'POST', '/api/student/photo', undefined);
check('사진 업로드 꺼진 수업에서 업로드 API 차단', r.status === 404, r.status);

r = await call(T, 'GET', `/api/teacher/classes/${cls.id}/aggregate`);
const aggText = JSON.stringify(r.data);
check('익명 집계: 01 분포 = c:1, b:1', r.data.q01?.c === 1 && r.data.q01?.b === 1, JSON.stringify(r.data.q01));
check('익명 집계에 참여 표식·ID·서술 없음', !aggText.includes(aTag) && !aggText.includes(aId) && !aggText.includes('비밀 서술'));

r = await call(T, 'GET', `/api/teacher/classes/${cls.id}/narratives`);
check('서술 검토(교사)에서 A 의 주장 확인', r.status === 200 && JSON.stringify(r.data).includes('비밀 서술'));

// 보고서 버전 충돌
r = await call(A, 'PUT', '/api/student/report', { identity: { name: '홍길동' }, sections: [], attachSandbox: false, version: 0 });
check('보고서 초안 저장', r.status === 200 && r.data.version === 1, r.data.version);
r = await call(A, 'PUT', '/api/student/report', { identity: {}, sections: [], attachSandbox: false, version: 0 });
check('옛 버전으로 저장 시 409 충돌(덮어쓰지 않음)', r.status === 409, r.status);
r = await call(A, 'POST', '/api/student/report/submit', { version: 1 });
check('보고서 제출', r.status === 200 && r.data.status === 'submitted');
r = await call(A, 'POST', '/api/student/report/submit', { version: 1 });
check('중복 제출 방지(같은 버전 재제출 409)', r.status === 409, r.status);

// 복구 키
r = await call(A, 'POST', '/api/student/recovery-key', {});
const rk = r.data.key;
const C = jar();
r = await call(C, 'POST', '/api/student/recover', { code: cls.code, key: rk });
check('복구 키로 다른 기기에서 이어 하기', r.status === 200 && r.data.participant?.id === aId);
r = await call(jar(), 'POST', '/api/student/recover', { code: cls.code, key: 'AAAA-BBBB-CCCC-DDDD' });
check('틀린 복구 키 거부', r.status === 404, r.status);

// 공공데이터 캐시 (키 없음 → 앱 계산)
r = await call(A, 'GET', '/api/publicdata/month?region=%EC%84%9C%EC%9A%B8&year=2026&month=10');
check('공공데이터 조회(키 없음 → 앱 계산 표시)', r.status === 200 && r.data.fallback === true && r.data.source === 'app-astronomy', `${r.data.sourceLabel}`);
const hasNextDayMoonset = r.data.riseSets?.some((x) => x.moonset === null || x.moonrise === null);
check('출몰 자료에 사건 없는 날(null) 표현 존재', hasNextDayMoonset);

// 정리
r = await call(T, 'DELETE', `/api/teacher/classes/${cls.id}`);
check('임시 수업 삭제', r.status === 200);
r = await call(A, 'GET', '/api/student/me');
check('수업 삭제 후 학생 세션 무효', r.data?.session === null, JSON.stringify(r.data).slice(0, 60));

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.detail !== '' ? `  (${x.detail})` : ''}`);
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} passed`);
