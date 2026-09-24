/**
 * 앱의 천문 계산(Astronomy Engine) — 기관 키가 없거나 장애일 때의 대체 자료.
 * 화면에는 항상 '앱 계산(기관 자료 아님)'으로 표시된다. 실제 관측 검증 자료로 쓰지 않는다.
 *
 * 기준: 월령은 해당 날짜 12:00 KST 에서 '직전 삭 이후 지난 날수'. 출몰 시각은 KST 그 날 00:00~24:00 안의 사건.
 */
import * as Astro from 'astronomy-engine';
import type { LunarAgeRow, RiseSetRow } from '@shared/publicdata';
import { epochToKstDate, epochToKstTime, kstToEpoch } from '@shared/horizon';
import type { Region } from '@shared/regions';

export function appLunarAge(dateISO: string): LunarAgeRow {
  const noon = new Date(kstToEpoch(dateISO, '12:00'));
  const t = Astro.MakeTime(noon);
  // 직전 삭(위상 0°)을 최대 32일 전까지 뒤로 찾는다
  const prevNew = Astro.SearchMoonPhase(0, t.AddDays(-32), 33);
  let age: number | null = null;
  if (prevNew) {
    // SearchMoonPhase 는 시작 이후 첫 삭을 찾으므로, 12:00 이전의 마지막 삭을 얻기 위해 다음 삭도 확인
    let last = prevNew;
    for (let i = 0; i < 3; i++) {
      const next = Astro.SearchMoonPhase(0, last.AddDays(1), 33);
      if (!next || next.ut > t.ut) break;
      last = next;
    }
    age = t.ut - last.ut;
  }
  return {
    date: dateISO,
    lunarAge: age === null ? null : Math.round(age * 100) / 100,
    basis: '앱 계산(Astronomy Engine) — 12:00 KST 기준 직전 삭 이후 지난 날수',
    source: 'app-astronomy',
  };
}

function searchWithinDay(body: Astro.Body, observer: Astro.Observer, dir: 1 | -1, dateISO: string): string | null {
  const start = new Date(kstToEpoch(dateISO, '00:00'));
  const found = Astro.SearchRiseSet(body, observer, dir, Astro.MakeTime(start), 1.05);
  if (!found) return null;
  const ms = found.date.getTime();
  if (epochToKstDate(ms) !== dateISO) return null;
  return epochToKstTime(ms);
}

export function appRiseSet(region: Region, dateISO: string): RiseSetRow {
  const observer = new Astro.Observer(region.lat, region.lon, 50);
  return {
    date: dateISO,
    location: region.kasiName,
    sunrise: searchWithinDay(Astro.Body.Sun, observer, 1, dateISO),
    sunset: searchWithinDay(Astro.Body.Sun, observer, -1, dateISO),
    moonrise: searchWithinDay(Astro.Body.Moon, observer, 1, dateISO),
    moonset: searchWithinDay(Astro.Body.Moon, observer, -1, dateISO),
    moontransit: null,
    source: 'app-astronomy',
  };
}

/** 참고: 특정 시각의 달 밝은 비율·위상각 (앱 계산). 07의 참고 배치에 쓴다. */
export function appIllumination(dateISO: string, hhmm: string) {
  const t = Astro.MakeTime(new Date(kstToEpoch(dateISO, hhmm)));
  const illum = Astro.Illumination(Astro.Body.Moon, t);
  const phase = Astro.MoonPhase(t); // 태양 기준 달의 황경 차이 0~360 (0 삭, 90 상현, 180 보름, 270 하현)
  return { fraction: illum.phase_fraction, phaseAngleDeg: illum.phase_angle, elongationDeg: phase };
}
