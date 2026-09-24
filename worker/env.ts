/// <reference path="../worker-configuration.d.ts" />

/**
 * Worker 환경. 생성된 Env(wrangler types)에 선택 바인딩을 더한다.
 * - PHOTOS: 비공개 R2 (P2 사진 업로드). wrangler.jsonc 에서 주석을 풀어야 바인딩된다.
 * - KASI_KEY_IS_ENCODED: 'true' 면 서비스키를 URL 인코딩하지 않고 그대로 붙인다.
 */
export interface AppEnv extends Env {
  PHOTOS?: R2Bucket;
  KASI_KEY_IS_ENCODED?: string;
}

export type Variables = {
  participant?: import('./auth/student').StudentContext;
  teacher?: import('./auth/teacher').TeacherContext;
};

export type HonoEnv = { Bindings: AppEnv; Variables: Variables };
