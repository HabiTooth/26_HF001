import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

// 배포본에서 /qa 차단. 기록 전체 삭제 API 호출 항목 있음
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_QA === 'true';

export default function Layout({ children }: { children: React.ReactNode }) {
  if (!ENABLED) notFound();
  return <AuthGuard>{children}</AuthGuard>;
}
