import type { LesionType, RiskLevel } from '@/lib/api/common';

export type ProductCategory = '칫솔' | '치약' | '치아 사이' | '보조 용품';

export interface ShopItem {
  brand: string;
  name: string;
  keyword: string;
}

export type ProductArt =
  | 'brush'
  | 'electric'
  | 'paste'
  | 'tartar'
  | 'floss'
  | 'interdental'
  | 'waterjet'
  | 'mouthwash'
  | 'tongue';

export interface Product {
  id: string;
  category: ProductCategory;
  name: string;
  art: ProductArt;
  tint: string;
  lookFor: string[];
  helpsWith: LesionType[];
  baseline?: boolean;
  items: ShopItem[];
}

const OLIVEYOUNG_SEARCH = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=';

export const shopUrl = (keyword: string) => `${OLIVEYOUNG_SEARCH}${encodeURIComponent(keyword)}`;

export const PRODUCTS: Product[] = [
  {
    id: 'soft-brush',
    art: 'brush',
    tint: '#E1EDF8',
    category: '칫솔',
    name: '부드러운 모 칫솔',
    lookFor: ['soft 또는 부드러움 표기', '머리가 작아 어금니 안쪽까지 들어가는 것'],
    helpsWith: ['PLAQUE'],
    baseline: true,
    items: [
      { brand: '큐라프록스', name: 'CS 5460 울트라 소프트', keyword: '큐라프록스 5460' },
      { brand: '페리오', name: '더블액션 칫솔', keyword: '페리오 칫솔' },
    ],
  },
  {
    id: 'fluoride-paste',
    art: 'paste',
    tint: '#DDF1E8',
    category: '치약',
    name: '불소 치약',
    lookFor: ['불소 1,000ppm 이상', '연마제가 과하지 않은 것'],
    helpsWith: ['PLAQUE'],
    baseline: true,
    items: [
      { brand: '페리오', name: '46cm 토탈케어', keyword: '페리오 46cm' },
      { brand: '메디안', name: '치약', keyword: '메디안 치약' },
    ],
  },
  {
    id: 'electric-brush',
    art: 'electric',
    tint: '#E6E4FA',
    category: '칫솔',
    name: '전동칫솔',
    lookFor: ['압력 감지 기능', '2분 타이머', '작은 원형 또는 음파 헤드'],
    helpsWith: ['PLAQUE'],
    items: [
      { brand: '오랄비', name: '전동칫솔', keyword: '오랄비 전동칫솔' },
      { brand: '필립스', name: '소닉케어', keyword: '필립스 소닉케어' },
    ],
  },
  {
    id: 'floss',
    art: 'floss',
    tint: '#FBE7E9',
    category: '치아 사이',
    name: '치실',
    lookFor: ['왁스 코팅 (처음 쓴다면)', '치아 사이가 빡빡하면 얇은 테이프형'],
    helpsWith: ['PLAQUE'],
    items: [
      { brand: '오랄비', name: '에센셜 플로스', keyword: '오랄비 치실' },
      { brand: 'GUM', name: '이지 플로서', keyword: 'GUM 치실' },
    ],
  },
  {
    id: 'interdental-brush',
    art: 'interdental',
    tint: '#FDEFDC',
    category: '치아 사이',
    name: '치간칫솔',
    lookFor: ['헐겁게 들어가는 가장 작은 사이즈부터', '철심이 코팅된 것'],
    helpsWith: ['PLAQUE', 'CALCULUS'],
    items: [
      { brand: '오랄비', name: '치간칫솔', keyword: '오랄비 치간칫솔' },
      { brand: 'GUM', name: '치간칫솔', keyword: 'GUM 치간칫솔' },
    ],
  },
  {
    id: 'tartar-paste',
    art: 'tartar',
    tint: '#E3F0FB',
    category: '치약',
    name: '타르타르 컨트롤 치약',
    lookFor: ['피로인산염 또는 아연 성분', '이미 굳은 치석은 못 없애고 새로 굳는 걸 늦춤'],
    helpsWith: ['CALCULUS'],
    items: [
      { brand: '페리오', name: '치석케어', keyword: '페리오 치석' },
      { brand: '2080', name: '치석케어 치약', keyword: '2080 치석' },
    ],
  },
  {
    id: 'water-flosser',
    art: 'waterjet',
    tint: '#DCF0F7',
    category: '보조 용품',
    name: '구강 세정기',
    lookFor: ['수압 조절 단계', '치실을 대신하진 못하고 함께 쓰는 용도'],
    helpsWith: ['CALCULUS', 'PLAQUE'],
    items: [{ brand: '워터픽', name: '구강세정기', keyword: '구강세정기' }],
  },
  {
    id: 'mouthwash',
    art: 'mouthwash',
    tint: '#E8F4E1',
    category: '보조 용품',
    name: '가글',
    lookFor: ['알코올이 없는 것 (입 마름 예방)', '칫솔질을 대신하는 용도가 아님'],
    helpsWith: ['PLAQUE'],
    items: [
      { brand: '리스테린', name: '쿨민트 제로', keyword: '리스테린 제로' },
      { brand: '가그린', name: '오리지널', keyword: '가그린' },
    ],
  },
  {
    id: 'tongue-cleaner',
    art: 'tongue',
    tint: '#FCE8EE',
    category: '보조 용품',
    name: '혀 클리너',
    lookFor: ['날이 부드러운 것', '칫솔 뒷면 돌기로도 대체 가능'],
    helpsWith: ['PLAQUE'],
    items: [{ brand: '', name: '혀 클리너', keyword: '혀클리너' }],
  },
];

const RISKY: RiskLevel[] = ['HIGH', 'CRITICAL'];

export const isRisky = (level: RiskLevel) => RISKY.includes(level);

export function recommendProducts(
  categories: Array<{ lesionType: LesionType; riskLevel: RiskLevel }> = [],
): Product[] {
  const risky = categories.filter((c) => isRisky(c.riskLevel)).map((c) => c.lesionType);

  if (risky.length === 0) return PRODUCTS.filter((p) => p.baseline);

  const matched = PRODUCTS.filter((p) => p.helpsWith.some((t) => risky.includes(t)));
  const rest = PRODUCTS.filter((p) => p.baseline && !matched.includes(p));
  return [...matched, ...rest];
}
