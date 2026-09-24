let cached: boolean | null = null;

/** WebGL 사용 가능 여부. 불가능하면 2D 대체 활동을 제공한다(원문 9절). */
export function webglAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    cached = Boolean(gl);
  } catch {
    cached = false;
  }
  return cached;
}
