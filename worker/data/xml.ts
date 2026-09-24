/**
 * 공공데이터포털 XML 응답을 다루는 최소 파서. 외부 라이브러리 없이 <item> 블록과
 * 단순 태그(<tag>값</tag>)만 읽는다. 중첩 구조·속성은 다루지 않는다.
 */

export interface ParsedOpenApi {
  /** 정상 응답의 <header><resultCode> */
  resultCode: string | null;
  resultMsg: string | null;
  /** 오류 응답(OpenAPI_ServiceResponse)의 returnReasonCode */
  errorCode: string | null;
  errorMsg: string | null;
  items: Record<string, string | undefined>[];
  totalCount: number | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagValue(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1]) : null;
}

export function parseOpenApiXml(xml: string): ParsedOpenApi {
  const items: Record<string, string | undefined>[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const fields: Record<string, string | undefined> = {};
    const fieldRe = /<([A-Za-z_][\w]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<([A-Za-z_][\w]*)\s*\/>/g;
    let f: RegExpExecArray | null;
    while ((f = fieldRe.exec(m[1]))) {
      if (f[3]) fields[f[3]] = '';
      else fields[f[1]] = decodeEntities(f[2]);
    }
    items.push(fields);
  }
  const header = xml.match(/<header>([\s\S]*?)<\/header>/)?.[1] ?? '';
  const totalCountStr = tagValue(xml, 'totalCount');
  return {
    resultCode: tagValue(header, 'resultCode'),
    resultMsg: tagValue(header, 'resultMsg'),
    errorCode: tagValue(xml, 'returnReasonCode'),
    errorMsg: tagValue(xml, 'returnAuthMsg') ?? tagValue(xml, 'errMsg'),
    items,
    totalCount: totalCountStr ? Number(totalCountStr) : null,
  };
}
