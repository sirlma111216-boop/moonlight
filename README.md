# 달의 비밀: 관측에서 우주까지

중학교 과학(달의 위상 변화와 일식·월식)을 위한 한국어 개인 학습 웹앱. 실제 관측 → 공공데이터 해석 → 직접 움직이는 3D 모형 → 일식·월식 탐구 → 개인 보고서가 하나로 이어진다. 3차시(45분×3) 기본, 2차시 압축 모드 제공.

- 저장소: https://github.com/sirlma111216-boop/moonlight
- 배포 주소: https://moonlight.sirlma.workers.dev (Cloudflare Workers, 교사 인증은 접근 키 모드)
- 배포 구조: Vite/React/TypeScript + Cloudflare Workers(정적 자산 + Hono API) + D1 (+ 선택 R2)
- 문서: [배포](docs/DEPLOY.md) · [교사용 안내](docs/TEACHER_GUIDE.md) · [과학 모형의 단순화](docs/SCIENCE_MODEL.md) · [에셋 명세·미확보 목록](docs/ASSETS.md) · [검증 결과](docs/VERIFICATION.md)

## 로컬 실행

```bash
npm install
cp .dev.vars.example .dev.vars          # SESSION_SECRET, TEACHER_ACCESS_KEY 등을 채운다
npm run db:migrate:local                # 로컬 D1 스키마
npm run dev                             # http://localhost:5173 (Worker 도 함께 실행됨)
```

- 교사 화면: `/teacher` → `.dev.vars` 의 `TEACHER_ACCESS_KEY` 로 로그인 → 수업 만들기 → 6자리 코드.
- 학생 화면: `/` → 코드 입력. 이름·회원가입 없음.
- 검사: `npm test` (단위 테스트), `npm run typecheck`, `npm run build`.

## 환경 변수·비밀값

| 이름 | 종류 | 설명 |
|---|---|---|
| `SESSION_SECRET` | secret | 세션 토큰·복구 키 해시(HMAC)용. 32자 이상 |
| `TEACHER_ACCESS_KEY` | secret | 교사 접근 키 모드(Access 연동 전 임시) |
| `KASI_SERVICE_KEY` | secret | 공공데이터포털(한국천문연구원) 디코딩 서비스키. 없으면 04는 앱 계산으로 대체되고 표시됨 |
| `KASI_KEY_IS_ENCODED` | secret/var | `true` 면 키를 URL 인코딩하지 않고 그대로 붙임 |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | secret | Cloudflare Access 교사 인증(권장 운영) |
| `DEV_TEACHER_BYPASS` | `.dev.vars` 전용 | `true` 면 로컬에서 개발용 교사 로그인. 운영 번들에서 제거됨 |
| `APP_NAME`, `DEFAULT_REGION`, `ENVIRONMENT` | var (`wrangler.jsonc`) | 앱 이름(설정에서 변경), 기본 지역 |

비밀값은 `VITE_` 변수·브라우저 번들·로그·커밋에 넣지 않는다. 프록시는 허용한 두 기관 API 만 호출한다.

## 구조

```
shared/        클라이언트·Worker 공용: 위상 수학, 식 판정, 출몰 판정, 타입, 지역, 관측 자료 매니페스트
worker/        Hono API — 학생 세션(쿠키), 교사 인증(Access/키/개발), KASI 어댑터+캐시, D1 쿼리, 크론 정리
src/content/   12단계·장면 정의, 용어집, 영상 슬롯, 삽화 슬롯, 배지 (UI 코드에 문구·정답을 흩뿌리지 않음)
src/three/     3D: 우주 시점, 지구 시점(망원경), 02 미니 장면, 2D 대체 화면, ModelLab
src/pages/     학생 셸·12단계 화면·보고서 인쇄·자유 실험, 교사 콘솔
migrations/    D1 스키마
docs/          배포·교사 안내·과학 모형·에셋·검증
public/media, public/illustrations, public/textures   에셋 자리(README 참고)
```

## 어댑터 확인 기록 (수정 지시 R6)

이번 구현에서는 **실제 서비스키 없이** 문서 기준으로 어댑터를 작성했다. 아래는 확인한 사실과 확인하지 못한 사항이다.

| 항목 | 상태 |
|---|---|
| 월령 API(`LunPhInfoService/getLunPhInfo`)는 `solYear/solMonth/solDay` 하루 단위 조회 | 문서 기준. 월 단위 일괄 조회 항목이 확인되지 않아 **Worker 가 해당 월의 날짜를 순회 호출하고 날짜 단위로 D1 에 캐시**한다(120일). 같은 날짜의 호출은 캐시로 1회만 발생하며 isolate 안에서는 in-flight 요청을 합친다 |
| 월령의 기준 시각 | **미확인**. 화면에 ‘기관 자료의 기준 시각은 문서 확인 필요’로 표시 |
| 출몰 API(`RiseSetInfoService/getAreaRiseSetInfo`) 입력 `locdate`(YYYYMMDD) + `location`(지역명) | 문서 기준. 좌표 입력은 `getLCRiseSetInfo`. 지역명 목록(`shared/regions.ts`)은 실제 응답으로 확인 필요 |
| 출몰 응답의 빈 값 표현 | **미확인**. 어댑터는 4자리 숫자가 아니면 ‘사건 없음(null)’, 태그가 없으면 ‘결측(undefined)’으로 다루고 원문을 `raw` 에 남긴다 |
| 시간대 | KST(UTC+9) 고정 오프셋으로 처리. 날짜만 있는 값을 UTC 자정으로 다루지 않는다. 기관 자료의 시간대 표기는 문서 확인 대상 |
| 실제 키로 검증 | 교사 콘솔 ‘API 상태 → 지금 점검’이 오늘 자료 1건씩 호출해 원문 항목을 기록한다. 키를 넣은 뒤 여기서 성공해야 연동 성공이다 |

기관 실패·키 없음일 때는 Astronomy Engine 으로 계산한 값을 ‘앱 계산(기관 자료 아님)’ 배지와 함께 보여주며 실제 관측 검증에는 쓰지 않는다.

## 우선순위별 상태 요약

자세한 표는 [docs/VERIFICATION.md](docs/VERIFICATION.md). 핵심 자료(실사진)·삽화·영상·달 텍스처는 모두 **자리만 비워 두고** 어떤 파일이 들어갈지 표시했다([docs/ASSETS.md](docs/ASSETS.md)).
