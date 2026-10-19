export type ScreenGroup =
  | '진입·인증'
  | '기기 연결'
  | '스캔'
  | '홈·리포트'
  | '기록'
  | '추가 기능'
  | '마이페이지'
  | '약관';

export interface ScreenCheck {
  id: string;
  group: ScreenGroup;
  label: string;
  path: string;
  needsParam?: boolean;
  expectText?: string[];
  points: string[];
}

export const SCREEN_GROUPS: ScreenGroup[] = [
  '진입·인증',
  '기기 연결',
  '스캔',
  '홈·리포트',
  '기록',
  '추가 기능',
  '마이페이지',
  '약관',
];

export const SCREEN_CHECKS: ScreenCheck[] = [
  {
    id: 'splash',
    group: '진입·인증',
    label: '스플래시',
    path: '/splash',
    points: [
      '로고 드로잉 애니메이션이 끝까지 재생되는지',
      '토큰 있으면 대시보드, 없으면 로그인으로 갈라지는지',
      '기기 미등록 계정은 페어링으로 가는지',
    ],
  },
  {
    id: 'login',
    group: '진입·인증',
    label: '로그인',
    path: '/login',
    expectText: ['HabiTooth'],
    points: [
      '이 화면이 전체 디자인의 기준. 다른 화면과 배경·카드·여백이 맞는지',
      '자동 로그인 체크하면 새로고침 후에도 유지되는지',
      '카카오·구글 버튼이 실제로 리다이렉트되는지',
      '틀린 비밀번호일 때 에러 문구가 뜨는지',
    ],
  },
  {
    id: 'register',
    group: '진입·인증',
    label: '회원가입',
    path: '/register',
    expectText: ['회원가입', '약관 동의'],
    points: [
      '이메일 형식·비밀번호 규칙 검증이 도는지',
      '약관 필수 항목 체크 안 하면 가입이 막히는지',
      '가입 후 온보딩으로 넘어가는지',
    ],
  },
  {
    id: 'forgot',
    group: '진입·인증',
    label: '이메일·비밀번호 찾기',
    path: '/forgot-email',
    expectText: ['이메일 찾기'],
    points: ['입력 검증이 도는지', '뒤로가기가 로그인으로 돌아오는지'],
  },
  {
    id: 'onboarding',
    group: '진입·인증',
    label: '온보딩',
    path: '/onboarding',
    expectText: ['HabiTooth'],
    points: ['슬라이드 넘김과 인디케이터가 맞는지', '건너뛰기가 동작하는지'],
  },

  {
    id: 'pairing',
    group: '기기 연결',
    label: '디바이스 연결',
    path: '/pairing',
    expectText: ['디바이스 연결', '발견된 기기'],
    points: [
      '같은 기기가 두 번 뜨지 않는지 (이름 + IP 중복)',
      '기기 이름 옆에 주소와 응답 시간이 보이는지',
      '스크롤 내릴 때 하단 카드가 같이 움직이지 않는지',
      '도움말 보기 누르면 체크리스트가 펼쳐지는지',
      '연결하기 누르면 대시보드로 넘어가는지',
    ],
  },
  {
    id: 'device',
    group: '기기 연결',
    label: '디바이스 설정',
    path: '/mypage/device',
    expectText: ['디바이스 설정', '웹캠으로 촬영'],
    points: [
      '표시된 주소가 실제 쓰는 주소인지 (env면 안내 문구가 뜸)',
      '연결 해제 버튼이 보이는지. 등록 안 된 계정은 등록 버튼이 뜨는지',
      '웹캠 토글이 스캔 화면에 반영되는지',
      '연결 해제하면 페어링으로 넘어가고 계정·기록은 남는지',
    ],
  },

  {
    id: 'scan-step1',
    group: '스캔',
    label: '스캔 1단계 (구역 선택)',
    path: '/scan',
    expectText: ['실시간 구강 스캔'],
    points: [
      '구역 이름이 이해되는지 (작은어금니 → 송곳니 쪽)',
      '치아 정보 미등록이면 안내 배너가 뜨는지',
      '체크 안 하면 시작 버튼이 막히는지',
      '예상 소요 시간이 선택한 구역 수에 따라 바뀌는지',
    ],
  },
  {
    id: 'scan-step2',
    group: '스캔',
    label: '스캔 2단계 (촬영)',
    path: '/scan',
    points: [
      '스트림이 뜨는지. 안 뜨면 8초 뒤 안내 문구로 바뀌는지',
      '기기 셔터 버튼으로 찍은 컷이 확인 화면으로 넘어오는지',
      '웹 촬영 버튼이 동작하는지. 실패하면 괄호에 원인이 붙는지',
      '촬영 뒤 스트림이 다시 붙는지',
      '다시 찍기 / 이대로 다음이 제대로 동작하는지',
      '치식도에서 현재 구역이 강조되는지',
    ],
  },
  {
    id: 'scan-step3',
    group: '스캔',
    label: '스캔 3단계 (분석 중)',
    path: '/scan',
    points: [
      '단계 진행 표시가 순서대로 차오르는지',
      '분석 실패하면 실패 화면이 뜨는지 (가짜 데이터로 안 넘어가야 함)',
      '분석 다시 시도가 동작하는지',
    ],
  },
  {
    id: 'scan-step4',
    group: '스캔',
    label: '스캔 4단계 (완료)',
    path: '/scan',
    points: ['점수가 나오는지', '리포트 보기가 방금 세션으로 가는지'],
  },

  {
    id: 'dashboard',
    group: '홈·리포트',
    label: '대시보드',
    path: '/dashboard',
    expectText: ['분석 결과', '종합 점수'],
    points: [
      '요약 카드 어디를 눌러도 리포트로 넘어가는지',
      '요약 카드 색이 과하지 않고 깔끔한지',
      '스캔 기록 없는 계정에서 빈 상태가 뜨는지',
      '알림 아이콘에 안 읽은 개수가 붙는지',
      '퀵메뉴가 각 페이지로 제대로 가는지',
    ],
  },
  {
    id: 'report',
    group: '홈·리포트',
    label: '분석 리포트',
    path: '/report/1',
    needsParam: true,
    expectText: ['점수 변화 추이'],
    points: [
      '제목에 날짜가 붙는지 ("최근 분석 결과"로만 뜨면 안 됨)',
      '치아 분포 칩 개수가 3D 모형 색과 맞는지',
      '3D 모형 색이 파스텔 톤이고 시작 각도가 정면인지',
      '빠진 치아로 등록한 자리가 모형에서 빠지는지',
      '안 찍은 구역이 취소선으로 표시되고 모형에서 회색으로 보이는지',
      '병변 없는 치아가 회색이 아니라 깨끗(파랑)으로 칠해지는지',
      'LLM 리포트가 뜨는지. 실패하면 재시도 버튼이 나오는지',
      '자세히 / 상세보기 버튼 모양이 통일돼 있는지',
      '하단 여백이 탭바에 안 가리는지',
    ],
  },
  {
    id: 'compare',
    group: '홈·리포트',
    label: '스캔 비교',
    path: '/compare',
    expectText: ['치아별 변화'],
    points: [
      '스캔 2회 이상인 계정에서 비교가 되는지',
      '1회뿐이면 안내가 뜨는지',
      '좋아진 치아·나빠진 치아가 맞게 갈리는지',
    ],
  },

  {
    id: 'streak',
    group: '기록',
    label: '스캔 기록 달력',
    path: '/streak',
    expectText: ['지난 측정 기록', '연속 스캔'],
    points: [
      '탭바 기록 버튼이 이 화면으로 오는지',
      '기록 있는 날을 누르면 그날 리포트로 가는지',
      '달 이동이 되고 다음 달은 막혀 있는지',
      '연속 스캔 일수가 맞는지',
    ],
  },
  {
    id: 'history',
    group: '기록',
    label: '기록 이력 관리',
    path: '/mypage/history',
    points: [
      '목록 항목을 누르면 해당 리포트로 가는지',
      '기록 없을 때 빈 상태 문구가 뜨는지',
      '기간·점수 필터가 도는지',
    ],
  },
  {
    id: 'habits',
    group: '기록',
    label: '관리 습관',
    path: '/habits',
    expectText: ['오늘 할 일', '최근 일주일 관리 습관'],
    points: ['체크가 저장되고 새로고침해도 남는지', '주간 달성률이 맞게 계산되는지'],
  },

  {
    id: 'clinics',
    group: '추가 기능',
    label: '내 근처 치과',
    path: '/clinics',
    points: [
      '지도가 뜨는지 (안 뜨면 카카오 키·도메인 등록 확인)',
      '마커를 누르면 아래 목록이 그 항목으로 스크롤되는지',
      '선택된 카드가 흐려 보이지 않고 튀어 보이는지',
      '지도는 고정되고 목록만 스크롤되는지',
      '현 위치 버튼과 현 위치 마커 색이 구분되는지',
    ],
  },
  {
    id: 'products',
    group: '추가 기능',
    label: '관리 용품',
    path: '/products',
    expectText: ['추천 기준'],
    points: [
      '이미지가 이모지가 아니라 일러스트인지',
      '구매하기가 올리브영 검색으로 열리는지',
      '위험도에 맞는 제품이 위로 오는지',
    ],
  },
  {
    id: 'articles',
    group: '추가 기능',
    label: '헬스케어 아티클',
    path: '/articles',
    points: ['목록에서 상세로 들어가지는지', '읽는 시간 표시가 맞는지'],
  },
  {
    id: 'notifications',
    group: '추가 기능',
    label: '알림함',
    path: '/notifications',
    points: [
      '알림 하나 지웠을 때 나머지가 안 사라지는지',
      '지운 알림이 다시 안 생기는지',
      '마이페이지에서 푸시 끄면 새 알림이 안 쌓이는지',
      '알림을 누르면 해당 화면으로 가는지',
    ],
  },

  {
    id: 'mypage',
    group: '마이페이지',
    label: '마이페이지',
    path: '/mypage',
    expectText: ['마이페이지', '계정 관리', '알림 설정'],
    points: [
      '디바이스 상태 뱃지가 실제 상태와 맞는지',
      '치아 정보 요약이 등록한 내용과 맞는지',
      '알림 토글이 서버에 저장되는지',
      '메뉴가 전부 실제 페이지로 가는지 (404 없어야 함)',
    ],
  },
  {
    id: 'teeth',
    group: '마이페이지',
    label: '치아 정보',
    path: '/mypage/teeth',
    expectText: ['치아 정보', '빠진 치아가 있으면 알려주세요'],
    points: [
      '치식도에서 치아를 누르면 없음/있음이 토글되는지',
      '사랑니·교정 프리셋이 한 번에 적용되는지',
      '본문 줄간격이 답답하지 않은지',
      '저장 후 리포트 3D 모형에 반영되는지',
    ],
  },
  {
    id: 'profile',
    group: '마이페이지',
    label: '프로필 편집',
    path: '/mypage/profile',
    expectText: ['프로필 편집'],
    points: ['이름·생년월일 수정이 저장되는지', '저장 후 마이페이지에 반영되는지'],
  },
  {
    id: 'password',
    group: '마이페이지',
    label: '비밀번호 변경',
    path: '/mypage/password',
    expectText: ['비밀번호 변경'],
    points: ['현재 비밀번호 검증이 되는지', '새 비밀번호 규칙 검증이 되는지'],
  },
  {
    id: 'withdraw',
    group: '마이페이지',
    label: '회원 탈퇴',
    path: '/mypage/withdraw',
    expectText: ['회원 탈퇴'],
    points: [
      '404 안 뜨고 페이지가 열리는지',
      '체크 안 하면 버튼이 막히는지',
      '뭐가 지워지는지 명확히 적혀 있는지',
    ],
  },

  {
    id: 'terms',
    group: '약관',
    label: '이용약관 / 개인정보',
    path: '/terms',
    expectText: ['이용약관', '제1조 (목적)'],
    points: ['본문이 잘리지 않는지', '뒤로가기가 동작하는지'],
  },
];

export type ScreenStatus = 'idle' | 'pass' | 'fail' | 'hold';

export const STATUS_LABEL: Record<ScreenStatus, string> = {
  idle: '대기',
  pass: '통과',
  fail: '실패',
  hold: '보류',
};

export const STATUS_STYLE: Record<ScreenStatus, string> = {
  idle: 'bg-gray-100 text-gray-400',
  pass: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
  hold: 'bg-amber-100 text-amber-700',
};
