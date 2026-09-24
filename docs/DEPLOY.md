# 배포 안내 — GitHub → Cloudflare Workers

구조: **Vite/React/TypeScript 프런트엔드 + Cloudflare Workers Static Assets + 같은 Worker 의 API(Hono) + D1 + (선택) 비공개 R2**. 외부 Node 서버는 없다.

| 구성 | 역할 | 위치 |
|---|---|---|
| 정적 프런트엔드 | 학습 장면·자료 시각화·3D·보고서 | `src/`, 빌드 결과 `dist/client` |
| Worker API | 공공 API 대리 호출, 수업·참여자 권한, 저장·제출, 교사 관리 | `worker/` |
| D1 | 수업, 참여자, 응답, 관측, 모형 상태, 보고서, 캐시 | `migrations/` |
| 비공개 R2 | 학생 관측 사진(P2, 선택) | `wrangler.jsonc` 주석 |
| GitHub 연동 | 코드 변경 검증·배포 | `.github/workflows/deploy.yml` 또는 Workers Builds |

## 0. 준비할 것

- Cloudflare 계정 (Workers 무료 요금제로 시작 가능. 요청량·D1 읽기/쓰기·R2 저장량에 따라 과금될 수 있으며 ‘무조건 무료’를 보장하지 않는다)
- Node 24, npm, `npx wrangler login` 완료
- 공공데이터포털 계정과 한국천문연구원 두 API(월령 15012689, 출몰시각 15012688)의 **활용 신청 승인** 및 서비스키
- (권장) Cloudflare Zero Trust 팀 — 교사 인증을 Access 로 보호할 때

## 1. 리소스 생성

```bash
# D1 (이 저장소에는 이미 moonlight-db / 1ae9fdb3-4fa1-43d6-a84c-0b112088e713 가 연결되어 있다. 다른 계정이면 새로 만들고 wrangler.jsonc 의 database_id 를 바꾼다)
npx wrangler d1 create moonlight-db

# (선택, P2 사진 업로드) 비공개 R2 버킷
npx wrangler r2 bucket create moonlight-photos
```

## 2. 바인딩

`wrangler.jsonc` 의 `d1_databases[0].database_id` 를 자신의 D1 ID 로 맞춘다. R2 를 만들었다면 `r2_buckets` 주석을 해제한다. 바인딩을 바꾼 뒤 `npm run cf-typegen` 으로 타입을 다시 만든다.

## 3. D1 마이그레이션

```bash
npm run db:migrate:remote      # 운영
npm run db:migrate:local       # 로컬 개발
```

## 4. 비밀값 (Cloudflare secrets)

값은 채팅·커밋·`VITE_` 변수·브라우저 번들·로그에 넣지 않는다. `.dev.vars` 는 Git 에서 제외되어 있다.

```bash
npx wrangler secret put SESSION_SECRET        # 32자 이상 무작위 (예: openssl rand -hex 32)
npx wrangler secret put TEACHER_ACCESS_KEY    # 교사 접근 키 모드(Access 연동 전 임시)
npx wrangler secret put KASI_SERVICE_KEY      # 공공데이터포털 '디코딩' 키
# 인코딩 키만 있는 경우: npx wrangler secret put KASI_KEY_IS_ENCODED  (값 true)
```

## 5. 교사 인증

서버는 세 방식을 한 인터페이스(`worker/auth/teacher.ts`)로 검증한다.

| 방식 | 조건 | 용도 |
|---|---|---|
| `access` | `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` 설정 | **권장 운영**. Access JWT(RS256)를 팀 공개키로 검증 |
| `key` | `TEACHER_ACCESS_KEY` 설정 | Access 연동 전 임시 운영·로컬. 서버에서 상수 시간 비교, IP 당 1분 5회 제한, 서명된 HttpOnly 세션 쿠키 |
| `dev` | `.dev.vars` 의 `DEV_TEACHER_BYPASS=true` | 로컬 개발 전용. `import.meta.env.DEV` 로 감싸 **운영 번들에서 제거**된다 |

Cloudflare Access 연동 순서 (대시보드 작업, 이 저장소에서 자동화하지 않음):

1. Zero Trust → Access → Applications → **Self-hosted** 추가. 도메인은 배포된 Worker 주소, 경로는 `/teacher` 와 `/api/teacher` 두 개.
2. 정책: 교사 이메일(또는 학교 도메인)만 Allow.
3. 애플리케이션의 **AUD 태그**를 복사한다.
4. `npx wrangler secret put CF_ACCESS_TEAM_DOMAIN` (예: `myschool.cloudflareaccess.com`), `npx wrangler secret put CF_ACCESS_AUD`.
5. 배포 뒤 `/teacher` 접속 → Access 로그인 → ‘Cloudflare Access 로 계속’.
6. 연동이 확인되면 `TEACHER_ACCESS_KEY` 를 삭제해 키 모드를 끈다: `npx wrangler secret delete TEACHER_ACCESS_KEY`.

학생 API(`/api/student/*`, `/api/publicdata/*`)는 Access 로 막지 않는다.

## 6. GitHub 연결

저장소: https://github.com/sirlma111216-boop/moonlight

**방법 A — Workers Builds (Git 연동, 권장)**: Cloudflare 대시보드 → Workers & Pages → Create → *Import a repository* → `moonlight` 선택 → Build command `npm run build`, Deploy command `npx wrangler deploy`. 이후 `main` 푸시마다 빌드·배포되고 PR 은 미리보기 URL 을 받는다. (대시보드에서 GitHub 앱 권한을 승인해야 하므로 이 세션에서는 연결하지 않았다.)

**방법 B — GitHub Actions**: `.github/workflows/deploy.yml` 이 `main` 푸시 시 테스트·타입검사·빌드·D1 마이그레이션·배포를 수행한다. 저장소 Settings → Secrets 에 `CLOUDFLARE_API_TOKEN`(권한: Workers Scripts:Edit, D1:Edit), `CLOUDFLARE_ACCOUNT_ID` 를 넣는다. 시크릿이 없으면 테스트·빌드까지만 돈다.

## 7. 빌드·배포 (수동)

```bash
npm run build      # tsc -b && vite build  → dist/client + dist/moonlight
npx wrangler deploy
```

배포 주소는 `https://moonlight.<계정 subdomain>.workers.dev` 형태로 출력된다.

## 8. 확인

- `GET /api/health` → `{ ok: true }`
- `/teacher` 로그인 → 수업 생성 → ‘API 상태’ 탭 → **지금 점검**: 실제 키로 오늘 자료 1건씩 호출해 원문 항목을 기록한다. 여기서 성공해야 ‘기관 API 연동 성공’이다.
- 학생 화면에서 수업 코드 입장 → 04 자료 가져오기 → 배지가 ‘기관 예측 자료’인지 ‘앱 계산’인지 확인.

## 9. 개발·미리보기·운영 데이터 분리

운영 D1 에 미리보기 배포를 연결하지 않는다. 미리보기용 D1 을 따로 만들고 `wrangler.jsonc` 에 환경을 추가한다:

```jsonc
"env": {
  "preview": {
    "name": "moonlight-preview",
    "vars": { "ENVIRONMENT": "preview", "APP_NAME": "달의 비밀 (미리보기)", "DEFAULT_REGION": "서울" },
    "d1_databases": [{ "binding": "DB", "database_name": "moonlight-db-preview", "database_id": "<미리보기 D1 ID>", "migrations_dir": "migrations" }]
  }
}
```

배포: `CLOUDFLARE_ENV=preview npm run build && npx wrangler deploy --env preview`. 미리보기 환경의 비밀값은 `--env preview` 로 따로 넣는다. (이 구성은 문서 기준으로 작성했고 이번 세션에서 실제 배포로 확인하지 않았다.)

## 10. 백업·삭제

- 교사 콘솔 ‘보고서’ 탭 → **전체 기록 내보내기(JSON)** 로 수업 단위 백업.
- 수업 종료 → 보관 기간(기본 30일, 교사가 조정) 경과 시 매일 새벽(UTC 18시 크론) 자동 정리. ‘API 상태’ 탭에서 즉시 실행 가능.
- 참여자 단위 삭제(보고서 탭), 수업 전체 삭제(설정 탭). R2 사진은 수업 접두사로 함께 삭제된다.
- 학생은 ‘내 활동 종료’로 기기의 세션·로컬 캐시를 지운다(서버 제출 기록은 남는다).

## 11. 비용에 영향을 주는 것

- 공공 API 호출: 지역·월당 첫 조회 시 최대 약 64회(월령 31 + 출몰 33), 이후 120일 캐시. 학생 수만큼 중복 호출하지 않는다. 포털의 일일 트래픽 한도는 활용 신청 화면에서 확인한다.
- D1: 응답마다 1행 upsert. 학급 30명 × 100문항 수준은 무료 한도 안이지만 보장하지 않는다.
- R2: 사진 업로드를 켤 때만. 5MB 제한, EXIF 제거 후 저장.
