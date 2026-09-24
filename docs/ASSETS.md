# 에셋 명세 · 미확보 목록

모든 자리는 비어 있으며 화면에 ‘어떤 파일이 들어갈 자리인지’가 표시된다. 채우는 방법은 각 항목의 파일을 따른다.

## 1. 핵심 자료 (미확보 — 학습 활동의 증거로 쓰이므로 생성 이미지로 대체 불가)

| ID | 자리 | 채우는 곳 | 상태 |
|---|---|---|---|
| `moon-observation-1..4` | 01 사진 3장, 03 제공 자료, 07 비교 | `public/media/observations/` + `shared/mediaManifest.ts` 또는 교사 콘솔 | **미확보** |
| `eclipse-observation-solar` | 09 장면 B, 10 | `public/media/eclipses/` + 매니페스트 | **미확보** |
| `eclipse-observation-lunar` | 09 장면 C, 10 | 위와 같음 | **미확보** |
| `svs-phase-render-reference` | 07 참고 렌더(시뮬레이션 전용) | 매니페스트 | 선택 · 미확보 |

교사 콘솔 ‘관측 자료’ 탭은 실사진이 3장 미만이면 “01·07·09 활동에 필요한 실사진이 부족합니다”와 확보 체크리스트를 보여준다. 학생 화면은 해당 자리에 “교사가 자료를 준비 중입니다”를 보여주고 다른 단계는 진행된다.

메타데이터(IMAGE_PROMPTS.md 3절): 자료 ID·제목 / 촬영자·기관·원본 URL 또는 소유 근거 / 촬영 날짜·시각·시간대(모르면 ‘미상’) / 지역·방향 / 실사진·합성·시뮬레이션 / 처리 내용 / 이용 조건·저작자 표시 / 대체 텍스트·사용 단계.

## 2. 장식 삽화 (선택 — `src/content/assets.ts`, `public/illustrations/`)

| ID | 파일 | 용도 | 프롬프트 |
|---|---|---|---|
| `intro-observation` | `intro-observation.webp` (16:9, 1920×1080) | 01 도입 | IMAGE_PROMPTS.md 2-A |
| `evidence-desk` | `evidence-desk.webp` (16:9 또는 4:3) | 04 도입 | 2-B |
| `model-lab` | `model-lab.webp` (16:9) | 05 도입 | 2-C |
| `shadow-mystery` | `shadow-mystery.webp` (16:9) | 09 도입 | 2-D |
| `report-cover` | `report-cover.webp` (4:3, 밝은 배경) | 12 완료 카드·인쇄 표지 | 2-E |
| `achievement-emblems` | `achievement-emblems.webp` (1:1, 투명) | 배지 장식 | 2-F (기본 구현은 텍스트 배지) |

프롬프트의 ‘스타일 기준’에는 `DESIGN-cohere.md` 의 특징(흰 캔버스, 짙은 녹색 밴드, 소프트 스톤, 둥근 22px 카드, 절제된 코랄 포인트)을 넣는다. 생성 후 글자·여러 개의 달·부정확한 달 모양이 없는지 검수한다. 장식 이미지는 `alt=""` 로 표시되어 학습 판단 근거처럼 배치되지 않는다.

## 3. 영상 슬롯 (`src/content/videos.ts`)

| ID | 후보 | 자리 | 채우는 값 |
|---|---|---|---|
| `video-phases-shadows` | NASA Spotlite: Moon Phases and Shadows (`_5AG2dFxe4s` 후보) | 02 더 알아보기, 08 더 알아보기 | `youtubeId` |
| `video-solar-role` | The Moon’s Role in a Solar Eclipse (`jxanWTR8-yM` 후보) | 10 더 알아보기 | `youtubeId` |
| `video-lunar` | Understanding Lunar Eclipses (`lNi5UFpales` 후보) | 10 더 알아보기 (11 비교 설명에도 연결) | `youtubeId` |

교사가 실제 재생·학교망 접속·임베드 허용·자막을 확인한 뒤 ID 를 넣고, 교사 콘솔 ‘설정’에서 수업별로 켠다. 자동 재생 없음, 시청 전 예측·시청 후 비교 1문항, 시청 여부는 완료 판정에 쓰지 않음. 차단 시 공식 출처 링크와 앱이 쓴 요약을 보여준다.

## 4. 달 표면 텍스처 (선택 — `src/content/assets.ts` `MOON_TEXTURE`, `public/textures/`)

NASA SVS CGI Moon Kit 색상 맵을 2K 이하로 축소한 파일. 없으면 균일한 회색 재질, 크레디트 자리 비움.

## 5. 서체

디자인 문서의 CohereText/Unica77/CohereMono 는 보유하지 않아 Pretendard(jsDelivr) + 시스템 대체 스택을 쓴다. CDN 이 막히면 시스템 서체로 렌더링된다.
