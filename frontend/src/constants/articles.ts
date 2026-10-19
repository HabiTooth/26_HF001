import type { LesionType } from '@/lib/api/common';

export type ArticleCategory = '기본 관리' | '치태·치석' | '식습관' | '기기 사용';

export interface Article {
  id: string;
  cover: string;
  category: ArticleCategory;
  title: string;
  summary: string;
  readMinutes: number;
  /** 위험도 높은 사용자에게 우선 노출 */
  relatedTo: LesionType[];
  body: string[];
}

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  '기본 관리',
  '치태·치석',
  '식습관',
  '기기 사용',
];

export const ARTICLES: Article[] = [
  {
    id: 'brushing-basics',
    cover: '/images/articles/pastel/brushing-basics.webp',
    category: '기본 관리',
    title: '칫솔질, 세게보다 꼼꼼하게',
    summary: '힘을 주면 더 깨끗해질 것 같지만 실제로는 잇몸만 상해요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE'],
    body: [
      '칫솔을 세게 누르면 칫솔모가 눕습니다. 눕은 모는 치아 표면을 훑고 지나갈 뿐, 정작 닦여야 할 치아와 잇몸 사이 틈으로 들어가지 못합니다.',
      '적당한 힘은 손톱을 눌렀을 때 하얗게 변하지 않을 정도입니다. 칫솔모가 벌어지지 않는 선에서 작게 진동하듯 움직이는 편이 넓게 문지르는 것보다 낫습니다.',
      '치아와 잇몸이 만나는 경계에 칫솔모를 45도로 대고, 한 부위에서 열 번쯤 짧게 움직인 뒤 옆으로 옮깁니다. 전체를 한 바퀴 도는 데 2분 정도 걸립니다.',
      '칫솔모가 바깥으로 벌어지기 시작했다면 교체할 때입니다. 보통 3개월이지만, 힘을 주는 습관이 있으면 더 빨리 옵니다.',
    ],
  },
  {
    id: 'missed-spots',
    cover: '/images/articles/pastel/missed-spots.webp',
    category: '기본 관리',
    title: '늘 빠뜨리는 자리는 정해져 있어요',
    summary: '오른손잡이는 왼쪽 어금니 안쪽을 놓치기 쉬워요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE', 'CALCULUS'],
    body: [
      '칫솔질은 습관이라 매번 같은 순서로 하게 되고, 그래서 매번 같은 자리를 빠뜨립니다.',
      '오른손잡이는 손목이 자연스럽게 닿는 오른쪽 바깥면부터 시작해 왼쪽으로 갑니다. 마지막에 도착하는 왼쪽 어금니 안쪽은 이미 집중력이 떨어진 뒤라 대충 지나가기 쉽습니다.',
      '아래 앞니 안쪽도 자주 놓칩니다. 침샘이 바로 옆에 있어 침 속 미네랄이 쌓이기 좋은 자리인데, 칫솔을 세로로 세워야 닿아서 건너뛰게 됩니다.',
      '해결책은 순서를 바꾸는 것입니다. 하루는 왼쪽 어금니 안쪽부터 시작해 보세요. 스캔 결과에서 특정 구역만 계속 붉게 나온다면 그 자리부터 닦기 시작하면 됩니다.',
    ],
  },
  {
    id: 'floss-why',
    cover: '/images/articles/pastel/floss-why.webp',
    category: '기본 관리',
    title: '칫솔이 못 가는 40%',
    summary: '치아 사이는 칫솔모가 물리적으로 들어가지 않는 공간이에요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE'],
    body: [
      '치아 표면은 다섯 면입니다. 바깥면, 안쪽면, 씹는면, 그리고 옆 치아와 맞닿는 두 면. 칫솔은 앞의 세 면까지만 닿습니다.',
      '나머지 두 면이 전체 표면의 약 40%입니다. 이 사이 공간은 칫솔모 굵기보다 좁아서, 아무리 오래 닦아도 들어가지 않습니다.',
      '치실은 이 틈에 넣고 치아 옆면을 감싸듯 위아래로 훑는 도구입니다. 톱질하듯 좌우로 밀어 넣으면 잇몸이 베이니, 옆으로 살살 밀어 넣은 뒤 방향을 바꿉니다.',
      '치아 사이가 넓은 편이면 치간칫솔이 더 효율적입니다. 억지로 큰 사이즈를 넣으면 잇몸이 밀리니 헐겁게 들어가는 것부터 시작하세요.',
    ],
  },
  {
    id: 'plaque-to-calculus',
    cover: '/images/articles/pastel/plaque-to-calculus.webp',
    category: '치태·치석',
    title: '치태가 치석이 되기까지',
    summary: '이틀이면 굳기 시작해요.',
    readMinutes: 4,
    relatedTo: ['PLAQUE', 'CALCULUS'],
    body: [
      '치태는 치아 표면에 붙은 얇고 무른 막입니다. 세균과 그 세균이 만든 끈적한 물질, 음식 찌꺼기가 섞인 것으로, 칫솔로 닦아내면 지워집니다.',
      '이 막을 그대로 두면 침 속 칼슘과 인이 스며들어 굳습니다. 대략 이틀에서 사흘이면 딱딱해지기 시작하고, 2주쯤 지나면 완전히 단단해집니다.',
      '한 번 굳은 치석은 칫솔로 지워지지 않습니다. 표면이 거칠어서 그 위에 새 치태가 더 잘 붙고, 그 치태가 또 굳는 식으로 층이 쌓입니다.',
      '그래서 관리의 핵심은 치석을 없애는 게 아니라 치태가 굳기 전에 매일 걷어내는 것입니다. 이미 생긴 치석은 치과에서 제거해야 합니다.',
    ],
  },
  {
    id: 'where-calculus-forms',
    cover: '/images/articles/pastel/where-calculus-forms.webp',
    category: '치태·치석',
    title: '치석이 잘 생기는 자리',
    summary: '침샘 근처가 압도적이에요.',
    readMinutes: 3,
    relatedTo: ['CALCULUS'],
    body: [
      '치석은 침 속 미네랄이 굳어서 생기므로, 침이 많이 나오는 자리 근처에 몰립니다.',
      '가장 흔한 곳은 아래 앞니 안쪽입니다. 혀 밑에 침샘 출구가 있어 침이 계속 닿습니다. 두 번째는 위 어금니 바깥쪽으로, 볼 안쪽에 또 다른 침샘 출구가 있습니다.',
      '이 두 자리는 칫솔이 닿기 불편한 각도이기도 해서 조건이 겹칩니다. 아래 앞니 안쪽은 칫솔을 세로로 세우고, 위 어금니 바깥쪽은 입을 살짝 다물어 볼에 공간을 만든 뒤 닦으면 접근이 쉬워집니다.',
      '스캔에서 이 부위가 반복해서 잡힌다면 닦는 각도를 먼저 점검해 보세요.',
    ],
  },
  {
    id: 'gum-bleeding',
    cover: '/images/articles/pastel/gum-bleeding.webp',
    category: '치태·치석',
    title: '피가 나면 더 닦아야 할까',
    summary: '피하면 오히려 오래가요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE', 'CALCULUS'],
    body: [
      '칫솔질할 때 피가 나면 상처가 났다고 생각해 그 자리를 피하게 됩니다. 그런데 대개는 반대입니다.',
      '건강한 잇몸은 칫솔이 닿아도 잘 출혈하지 않습니다. 피가 난다는 건 그 부위 잇몸에 염증이 있어 혈관이 늘어나고 약해졌다는 신호이고, 염증의 원인은 대개 그 자리에 쌓인 치태입니다.',
      '피하면 치태가 더 쌓이고 염증이 깊어져 출혈이 더 오래갑니다. 부드러운 칫솔모로 살살, 대신 빠뜨리지 않고 닦으면 보통 일주일에서 열흘 사이에 줄어듭니다.',
      '2주가 지나도 그대로거나 점점 심해지면 칫솔질만으로 해결되는 상태가 아닐 수 있습니다. 치과에서 확인해 보세요.',
    ],
  },
  {
    id: 'sugar-frequency',
    cover: '/images/articles/pastel/sugar-frequency.webp',
    category: '식습관',
    title: '양보다 횟수가 중요해요',
    summary: '한 번에 먹는 편이 나눠 먹는 것보다 나아요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE'],
    body: [
      '당분이 들어오면 입 안 세균이 산을 만들고, 그 산이 치아 표면을 녹이기 시작합니다. 침이 산을 씻어내고 원래대로 되돌리는 데 20분에서 40분쯤 걸립니다.',
      '초콜릿 한 판을 한 번에 먹으면 산성 구간이 한 번 지나갑니다. 같은 양을 하루 종일 조금씩 먹으면 그 구간이 계속 이어집니다. 총량은 같아도 치아가 노출되는 시간은 몇 배가 됩니다.',
      '간식을 줄이기 어렵다면 시간을 모으는 것부터 해보세요. 식사 직후 디저트로 몰아 먹으면 이미 침이 많이 나오는 상태라 회복도 빠릅니다.',
      '설탕이 든 음료를 조금씩 오래 마시는 습관이 특히 불리합니다.',
    ],
  },
  {
    id: 'after-acid',
    cover: '/images/articles/pastel/after-acid.webp',
    category: '식습관',
    title: '신 음식 먹고 바로 닦지 마세요',
    summary: '30분 기다리는 편이 나아요.',
    readMinutes: 2,
    relatedTo: ['PLAQUE'],
    body: [
      '탄산음료, 과일주스, 식초가 든 음식은 입 안을 잠시 산성으로 만듭니다. 이때 치아 표면은 평소보다 물러진 상태입니다.',
      '그 상태에서 칫솔질을 하면 물러진 표면을 그대로 문질러 깎아내는 셈이 됩니다.',
      '침이 산을 중화하고 표면이 다시 단단해질 때까지 30분쯤 기다린 뒤 닦으세요. 그 사이가 찜찜하면 물로 한 번 헹구는 정도면 충분합니다.',
      '무설탕 껌을 씹어 침을 늘리는 것도 회복을 앞당깁니다.',
    ],
  },
  {
    id: 'water-and-saliva',
    cover: '/images/articles/pastel/water-and-saliva.webp',
    category: '식습관',
    title: '입이 마르면 관리가 어려워져요',
    summary: '침은 그 자체로 세정 장치예요.',
    readMinutes: 3,
    relatedTo: ['PLAQUE', 'CALCULUS'],
    body: [
      '침은 단순히 입을 촉촉하게 하는 게 아니라, 음식 찌꺼기를 씻어내고 산을 중화하고 치아 표면을 다시 단단하게 만드는 역할을 합니다.',
      '침이 줄면 이 기능이 한꺼번에 약해집니다. 물을 적게 마시거나, 코가 막혀 입으로 숨 쉬거나, 특정 약을 복용 중이면 입이 마르기 쉽습니다.',
      '자는 동안은 누구나 침 분비가 줄어듭니다. 자기 전 칫솔질이 특히 중요한 이유이고, 자기 직전에 단 것을 먹는 습관이 특히 불리한 이유이기도 합니다.',
      '물을 자주 마시고, 입으로 숨 쉬는 습관이 있다면 그 원인부터 살펴보는 편이 좋습니다.',
    ],
  },
  {
    id: 'scan-routine',
    cover: '/images/articles/pastel/scan-routine.webp',
    category: '기기 사용',
    title: '언제 스캔하는 게 좋을까',
    summary: '칫솔질 직후보다 직전이 쓸모 있어요.',
    readMinutes: 2,
    relatedTo: [],
    body: [
      '닦은 직후에 찍으면 대부분 깨끗하게 나옵니다. 결과는 기분 좋지만, 어디를 놓치고 있는지는 알 수 없습니다.',
      '닦기 직전에 찍으면 하루 동안 어디에 무엇이 쌓였는지 보입니다. 이 기록이 쌓여야 늘 놓치는 자리가 어디인지 드러납니다.',
      '시간대는 매번 비슷하게 맞추는 편이 좋습니다. 아침에 찍은 것과 저녁에 찍은 것은 조건이 달라서 점수를 그대로 비교하기 어렵습니다.',
      '매일이 부담스러우면 주 2~3회, 같은 요일 같은 시간으로 정해두세요.',
    ],
  },
  {
    id: 'scan-quality',
    cover: '/images/articles/pastel/scan-quality.webp',
    category: '기기 사용',
    title: '스캔이 잘 안 될 때',
    summary: '대부분 조명과 거리 문제예요.',
    readMinutes: 3,
    relatedTo: [],
    body: [
      '화면에 조명이 부족하다고 뜬다면 방 조명을 밝히거나 그림자를 피해 보세요. 얼굴 위쪽에서 빛이 오면 입 안에 그림자가 크게 생깁니다.',
      '너무 가깝다는 안내는 초점이 맞지 않는 거리라는 뜻입니다. 화면을 보면서 치아 윤곽이 또렷해지는 지점을 찾아 고정하세요.',
      '흔들림 경고가 계속 뜨면 팔꿈치를 어딘가에 받치고 찍는 편이 낫습니다. 손목만으로 각도를 조절하면 미세한 떨림이 그대로 들어갑니다.',
      '침이 많이 고이면 반사가 생겨 표면이 잘 안 잡힙니다. 찍기 전에 한 번 삼키고 시작하세요.',
    ],
  },
  {
    id: 'read-the-score',
    cover: '/images/articles/pastel/read-the-score.webp',
    category: '기기 사용',
    title: '점수를 읽는 법',
    summary: '절대값보다 흐름이 정보예요.',
    readMinutes: 3,
    relatedTo: [],
    body: [
      '한 번 찍은 점수는 그날 그 시점의 상태일 뿐입니다. 식사 직후인지, 마지막으로 닦은 지 얼마나 됐는지에 따라 크게 흔들립니다.',
      '의미가 있는 건 같은 조건에서 반복해 찍었을 때의 흐름입니다. 매일 같은 시간에 찍었는데 점수가 계속 내려가고 있다면, 그건 실제 변화일 가능성이 높습니다.',
      '구역별 결과도 마찬가지입니다. 한 번 붉게 나온 자리보다, 여러 번 연속으로 붉게 나오는 자리가 실제 약점입니다.',
      '이 앱의 결과는 관리 습관을 돌아보기 위한 참고 자료입니다. 통증이나 출혈처럼 몸이 보내는 신호가 있다면 점수와 무관하게 치과에서 확인하세요.',
    ],
  },
];

export const findArticle = (id: string) => ARTICLES.find((a) => a.id === id) ?? null;

export function sortByRelevance(articles: Article[], risky: LesionType[]): Article[] {
  if (risky.length === 0) return articles;
  const score = (a: Article) => (a.relatedTo.some((t) => risky.includes(t)) ? 0 : 1);
  return [...articles].sort((a, b) => score(a) - score(b));
}
