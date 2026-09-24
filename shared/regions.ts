/**
 * 출몰시각 조회에 쓰는 지역 목록.
 * `kasiName` 은 한국천문연구원 출몰시각 API(getAreaRiseSetInfo)의 `location` 입력에 그대로 쓴다.
 * ※ 실제 API가 받는 지역명 목록은 공식 문서·실제 응답으로 확인해야 한다(README '어댑터 확인 기록').
 * 좌표는 앱 계산(Astronomy Engine) 대체 모드와 표시용이며 정확한 개인 위치가 아니다.
 */
export interface Region {
  id: string;
  label: string;
  kasiName: string;
  lat: number;
  lon: number;
}

export const REGIONS: Region[] = [
  { id: 'seoul', label: '서울', kasiName: '서울', lat: 37.5665, lon: 126.978 },
  { id: 'incheon', label: '인천', kasiName: '인천', lat: 37.4563, lon: 126.7052 },
  { id: 'suwon', label: '수원', kasiName: '수원', lat: 37.2636, lon: 127.0286 },
  { id: 'chuncheon', label: '춘천', kasiName: '춘천', lat: 37.8813, lon: 127.7298 },
  { id: 'gangneung', label: '강릉', kasiName: '강릉', lat: 37.7519, lon: 128.8761 },
  { id: 'cheongju', label: '청주', kasiName: '청주', lat: 36.6424, lon: 127.489 },
  { id: 'daejeon', label: '대전', kasiName: '대전', lat: 36.3504, lon: 127.3845 },
  { id: 'jeonju', label: '전주', kasiName: '전주', lat: 35.8242, lon: 127.148 },
  { id: 'gwangju', label: '광주', kasiName: '광주', lat: 35.1595, lon: 126.8526 },
  { id: 'mokpo', label: '목포', kasiName: '목포', lat: 34.8118, lon: 126.3922 },
  { id: 'daegu', label: '대구', kasiName: '대구', lat: 35.8714, lon: 128.6014 },
  { id: 'pohang', label: '포항', kasiName: '포항', lat: 36.019, lon: 129.3435 },
  { id: 'busan', label: '부산', kasiName: '부산', lat: 35.1796, lon: 129.0756 },
  { id: 'ulsan', label: '울산', kasiName: '울산', lat: 35.5384, lon: 129.3114 },
  { id: 'changwon', label: '창원', kasiName: '창원', lat: 35.2281, lon: 128.6811 },
  { id: 'jeju', label: '제주', kasiName: '제주', lat: 33.4996, lon: 126.5312 },
];

export function findRegion(nameOrId: string): Region | undefined {
  return REGIONS.find((r) => r.id === nameOrId || r.label === nameOrId || r.kasiName === nameOrId);
}
