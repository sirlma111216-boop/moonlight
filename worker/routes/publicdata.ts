import { Hono } from 'hono';
import type { HonoEnv } from '../env';
import { resolveStudent } from '../auth/student';
import { resolveTeacher } from '../auth/teacher';
import { buildMonthData } from '../data/month';
import { appIllumination } from '../data/astro';
import { HttpError, clientIp, isISODate, isHHMM } from '../util/http';
import { rateLimit } from '../util/ratelimit';

/**
 * 공공데이터 프록시 — 허용한 두 기관 API만 대리 호출한다. 임의 URL 전달 기능이 아니다.
 * 학생 또는 교사 세션이 있어야 하며 IP 별 속도 제한을 둔다.
 */
export const publicdata = new Hono<HonoEnv>();

publicdata.use('*', async (c, next) => {
  const s = await resolveStudent(c);
  const t = s ? null : await resolveTeacher(c);
  if (!s && !t) throw new HttpError(401, '수업에 입장한 뒤 이용할 수 있어요.', 'no-session');
  await rateLimit(c.env.DB, `publicdata:${clientIp(c.req.raw)}`, 60, 60);
  await next();
});

publicdata.get('/month', async (c) => {
  const region = c.req.query('region') ?? c.env.DEFAULT_REGION;
  const year = Number(c.req.query('year'));
  const month = Number(c.req.query('month'));
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new HttpError(400, '연도·월이 올바르지 않습니다.');
  }
  const data = await buildMonthData(c.env, region, year, month);
  return c.json(data);
});

/** 07 참고 배치: 특정 시각의 앱 계산 밝은 비율·이각 */
publicdata.get('/illumination', (c) => {
  const date = c.req.query('date');
  const time = c.req.query('time') ?? '21:00';
  if (!isISODate(date) || !isHHMM(time)) throw new HttpError(400, '날짜·시각이 올바르지 않습니다.');
  return c.json({ ...appIllumination(date, time), source: 'app-astronomy', basis: `${date} ${time} KST` });
});
