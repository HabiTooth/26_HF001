'use client';

import Link from 'next/link';
import Image from 'next/image';

const MENU = [
  { href: '/mypage/teeth', label: '치아 정보', image: '/images/dashboard/tooth-background.webp' },
  { href: '/compare', label: '스캔 비교', image: '/images/dashboard/compare.webp' },
  { href: '/clinics', label: '근처 치과', image: '/images/dashboard/clinics.webp' },
  { href: '/products', label: '관리 용품', image: '/images/dashboard/products.webp' },
  { href: '/articles', label: '건강 정보', image: '/images/dashboard/articles.webp' },
];

export default function QuickMenu() {
  return (
    <nav aria-label="빠른 메뉴" className="flex sm:justify-around gap-2 overflow-x-auto snap-x snap-mandatory -mx-5 px-6 pt-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MENU.map(({ href, label, image }) => (
        <Link key={href} href={href} className="w-[72px] shrink-0 snap-start flex flex-col items-center gap-1 no-underline active:scale-95 transition-transform">
          <span className="relative w-[68px] h-[68px]"><Image src={image} alt="" fill sizes="96px" className="object-contain p-1" /></span>
          <span className="text-[11px] font-medium text-content whitespace-nowrap">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
