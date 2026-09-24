import type { BadgeRecord } from '@shared/types';

export const BADGES: Record<BadgeRecord['badgeId'], { title: string; desc: string; steps: string }> = {
  'data-interpreter': { title: '자료 해석가', desc: '실제 자료 두 개 이상을 연결해 관측 계획을 설명했어요.', steps: '04' },
  'moon-restorer': { title: '달 복원가', desc: '서로 다른 위상을 조작으로 재현하고 이유를 수정했어요.', steps: '06~08' },
  'shadow-tracker': { title: '그림자 추적자', desc: '일식·월식을 각각 만들고 빗나가는 사례까지 설명했어요.', steps: '10~11' },
  'manual-complete': { title: '달 설명서 완성', desc: '모든 종류의 근거를 연결해 보고서를 제출했어요.', steps: '12' },
};
