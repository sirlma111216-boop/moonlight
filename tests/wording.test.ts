import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 학생 화면 쉬운 말 검사 — 중학교 1학년이 설명 없이 만나면 막히는 말이
 * 학생에게 보이는 코드(문자열·JSX)에 다시 들어오면 실패한다. 주석은 검사하지 않는다.
 * 교과서 용어(위상, 삭, 초승달, 상현달, 보름달, 하현달, 그믐달, 월령, 공전, 일식, 월식)는 허용한다.
 */
const BANNED = [
  '광원',
  '판정',
  '결측',
  '근사 모형',
  '축척',
  '교선',
  '궤도면',
  '원반',
  '관측선',
  '정렬',
  '본그림자',
  '반그림자',
  '위상각',
  '기관 예측',
  '기관 자료',
  '앱 계산',
  '학습 모형',
  '시점',
  '허용',
  '정성',
  '출몰',
  '월출',
  '월몰',
  '일몰',
  '천체',
  '배치',
  '황도',
  'WebGL',
  'Astronomy Engine',
  '°',
];

/** 이 파일에서만 쓸 수 있는 말 (과학책 이름을 알려 주는 더 알아보기) */
const ALLOW: Record<string, string[]> = {
  'src/content/glossary.ts': ['궤도면', '교선'],
};

const ROOT = join(__dirname, '..');
const TARGETS = ['src/pages/student', 'src/pages/Landing.tsx', 'src/components', 'src/content', 'src/three', 'src/lib/report.ts', 'src/lib/publicdata.ts', 'src/lib/words.ts', 'shared/phaseMath.ts', 'shared/types.ts'];

function listFiles(rel: string): string[] {
  const abs = join(ROOT, rel);
  if (statSync(abs).isFile()) return [rel];
  return readdirSync(abs).flatMap((f) => listFiles(`${rel}/${f}`)).filter((f) => /\.(ts|tsx)$/.test(f));
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n');
}

describe('학생 화면 쉬운 말', () => {
  const files = TARGETS.flatMap(listFiles);
  it('검사할 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(20);
  });
  it.each(files)('%s 에 어려운 말이 없다', (file) => {
    const code = stripComments(readFileSync(join(ROOT, file), 'utf8'));
    const allowed = ALLOW[file] ?? [];
    const found = BANNED.filter((w) => !allowed.includes(w) && code.includes(w)).map((w) => {
      const line = code.split('\n').findIndex((l) => l.includes(w)) + 1;
      return `${w} (${line}행 근처)`;
    });
    expect(found).toEqual([]);
  });
});
