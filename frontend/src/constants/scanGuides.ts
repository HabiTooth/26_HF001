import type { ViewType } from '@/lib/api/scan';

// 구역별 촬영 예시 사진
const GUIDE_DIR = '/images/scan/guide';

export const GUIDE_SHOT: Record<ViewType, string> = {
  UPPER_RIGHT_MOLAR: `${GUIDE_DIR}/UPPER_RIGHT_MOLAR.webp`,
  UPPER_RIGHT_PREMOLAR: `${GUIDE_DIR}/UPPER_RIGHT_PREMOLAR.webp`,
  UPPER_FRONT: `${GUIDE_DIR}/UPPER_FRONT.webp`,
  UPPER_LEFT_PREMOLAR: `${GUIDE_DIR}/UPPER_LEFT_PREMOLAR.webp`,
  UPPER_LEFT_MOLAR: `${GUIDE_DIR}/UPPER_LEFT_MOLAR.webp`,
  LOWER_RIGHT_MOLAR: `${GUIDE_DIR}/LOWER_RIGHT_MOLAR.webp`,
  LOWER_RIGHT_PREMOLAR: `${GUIDE_DIR}/LOWER_RIGHT_PREMOLAR.webp`,
  LOWER_FRONT: `${GUIDE_DIR}/LOWER_FRONT.webp`,
  LOWER_LEFT_PREMOLAR: `${GUIDE_DIR}/LOWER_LEFT_PREMOLAR.webp`,
  LOWER_LEFT_MOLAR: `${GUIDE_DIR}/LOWER_LEFT_MOLAR.webp`,
  OUTER_RIGHT: `${GUIDE_DIR}/OUTER_RIGHT.webp`,
  OUTER_CENTER: `${GUIDE_DIR}/OUTER_CENTER.webp`,
  OUTER_LEFT: `${GUIDE_DIR}/OUTER_LEFT.webp`,
};

// 구역별 촬영 가이드라인. 스트림과 같은 4:3 캔버스
export const GUIDE_OUTLINE: Record<ViewType, string> = {
  UPPER_RIGHT_MOLAR: `${GUIDE_DIR}/UPPER_RIGHT_MOLAR-outline.webp`,
  UPPER_RIGHT_PREMOLAR: `${GUIDE_DIR}/UPPER_RIGHT_PREMOLAR-outline.webp`,
  UPPER_FRONT: `${GUIDE_DIR}/UPPER_FRONT-outline.webp`,
  UPPER_LEFT_PREMOLAR: `${GUIDE_DIR}/UPPER_LEFT_PREMOLAR-outline.webp`,
  UPPER_LEFT_MOLAR: `${GUIDE_DIR}/UPPER_LEFT_MOLAR-outline.webp`,
  LOWER_RIGHT_MOLAR: `${GUIDE_DIR}/LOWER_RIGHT_MOLAR-outline.webp`,
  LOWER_RIGHT_PREMOLAR: `${GUIDE_DIR}/LOWER_RIGHT_PREMOLAR-outline.webp`,
  LOWER_FRONT: `${GUIDE_DIR}/LOWER_FRONT-outline.webp`,
  LOWER_LEFT_PREMOLAR: `${GUIDE_DIR}/LOWER_LEFT_PREMOLAR-outline.webp`,
  LOWER_LEFT_MOLAR: `${GUIDE_DIR}/LOWER_LEFT_MOLAR-outline.webp`,
  OUTER_RIGHT: `${GUIDE_DIR}/OUTER_RIGHT-outline.webp`,
  OUTER_CENTER: `${GUIDE_DIR}/OUTER_CENTER-outline.webp`,
  OUTER_LEFT: `${GUIDE_DIR}/OUTER_LEFT-outline.webp`,
};

const TONGUE = "'아' 소리 내듯 혀를 바닥으로 내리고, ";
const MOLAR = (n: number) =>
  `최대한 첫 번째 큰 어금니가 잘리지 않게 큰 어금니 ${n}개를 담아 주세요.`;
const PREMOLAR = (n: number) => `송곳니가 잘리지 않게 송곳니 포함 ${n}개를 담아 주세요.`;
const FRONT = '앞니 4개 안쪽 면이 보이게, 가운데 앞니 틈이 화면 가운데 오게 찍어 주세요.';
const SIDE = '볼을 당기고 윗니·아랫니가 함께 보이게 최대한 어금니까지 담아 주세요.';

// 구역별 촬영 요령. 사랑니나 작은 어금니가 결손이면 담을 개수를 하나 줄임
export function guideTip(zone: ViewType, missing: readonly number[] = []): string {
  const count = (tooth: number) => (missing.includes(tooth) ? 2 : 3);
  switch (zone) {
    case 'UPPER_RIGHT_MOLAR':
      return MOLAR(count(18));
    case 'UPPER_LEFT_MOLAR':
      return MOLAR(count(28));
    case 'UPPER_RIGHT_PREMOLAR':
      return PREMOLAR(count(14));
    case 'UPPER_LEFT_PREMOLAR':
      return PREMOLAR(count(24));
    case 'UPPER_FRONT':
      return FRONT;
    case 'LOWER_RIGHT_MOLAR':
      return TONGUE + MOLAR(count(48));
    case 'LOWER_LEFT_MOLAR':
      return TONGUE + MOLAR(count(38));
    case 'LOWER_RIGHT_PREMOLAR':
      return TONGUE + PREMOLAR(count(44));
    case 'LOWER_LEFT_PREMOLAR':
      return TONGUE + PREMOLAR(count(34));
    case 'LOWER_FRONT':
      return TONGUE + FRONT;
    case 'OUTER_RIGHT':
    case 'OUTER_LEFT':
      return SIDE;
    case 'OUTER_CENTER':
      return '윗니·아랫니 앞니가 각각 4개씩 함께 보이게, 가운데 앞니 틈을 화면 가운데 맞춰 주세요.';
  }
}
