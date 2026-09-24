/**
 * 업로드 사진 검증·재처리(P2). 형식을 바이트로 확인하고 JPEG 의 EXIF/메타데이터 세그먼트를 제거한다.
 * HTML/SVG 등은 받지 않는다. PNG 는 텍스트 청크(tEXt/iTXt/zTXt/eXIf)를 제거한다.
 */
export type ImageKind = 'jpeg' | 'png';

export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  return null;
}

function stripJpeg(b: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker === 0xda) {
      // SOS 이후는 그대로 복사
      for (let j = i; j < b.length; j++) out.push(b[j]);
      return Uint8Array.from(out);
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    const isApp = marker >= 0xe0 && marker <= 0xef; // APPn (EXIF, XMP, ICC 등)
    const isCom = marker === 0xfe;
    if (!isApp && !isCom) {
      for (let j = i; j < i + 2 + len && j < b.length; j++) out.push(b[j]);
    }
    i += 2 + len;
  }
  return Uint8Array.from(out);
}

function stripPng(b: Uint8Array): Uint8Array {
  const out: number[] = Array.from(b.subarray(0, 8));
  let i = 8;
  const drop = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']);
  while (i + 8 <= b.length) {
    const len = (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const total = 12 + len;
    if (!drop.has(type)) for (let j = i; j < i + total && j < b.length; j++) out.push(b[j]);
    i += total;
    if (type === 'IEND') break;
  }
  return Uint8Array.from(out);
}

export function stripToSafeImage(b: Uint8Array, kind: ImageKind): Uint8Array {
  return kind === 'jpeg' ? stripJpeg(b) : stripPng(b);
}
