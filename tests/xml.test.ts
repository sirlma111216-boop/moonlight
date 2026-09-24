import { describe, expect, it } from 'vitest';
import { parseOpenApiXml } from '../worker/data/xml';

/** 공공데이터포털 응답 형식은 문서 기준의 예시이며 실제 응답으로 검증하지 못했다(README '어댑터 확인 기록'). */
const OK = `<?xml version="1.0" encoding="UTF-8"?>
<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><items><item><lunAge>12.34</lunAge><solDay>24</solDay><solMonth>09</solMonth><solYear>2026</solYear></item></items>
<numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>1</totalCount></body></response>`;

const RISESET = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><items><item><location>서울</location><locdate>20260924</locdate><moonrise>1550    </moonrise><moonset></moonset><sunrise>0623</sunrise><sunset>1826</sunset></item></items></body></response>`;

const PORTAL_ERROR = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;

describe('XML 파서', () => {
  it('정상 응답의 item 과 header 를 읽는다', () => {
    const p = parseOpenApiXml(OK);
    expect(p.resultCode).toBe('00');
    expect(p.items[0].lunAge).toBe('12.34');
    expect(p.totalCount).toBe(1);
  });
  it('빈 태그와 공백 포함 값을 구분해 남긴다', () => {
    const p = parseOpenApiXml(RISESET);
    expect(p.items[0].moonrise).toBe('1550    ');
    expect(p.items[0].moonset).toBe('');
    expect(p.items[0].moontransit).toBeUndefined();
  });
  it('포털 공통 오류 응답을 읽는다', () => {
    const p = parseOpenApiXml(PORTAL_ERROR);
    expect(p.errorCode).toBe('30');
    expect(p.errorMsg).toContain('NOT_REGISTERED');
    expect(p.items).toHaveLength(0);
  });
});
