'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import PageShell from '@/components/organisms/PageShell';
import Checkbox from '@/components/atoms/Checkbox';
import { userApi } from '@/lib/api/user';
import { useAuthStore } from '@/stores/authStore';
import PageHeader from '@/components/molecules/PageHeader';

const ERASED = ['스캔 세션과 촬영한 사진', '분석 리포트와 점수 기록', '연속 스캔 기록'];

export default function WithdrawPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const erase = async () => {
    setBusy(true);
    setError(null);
    try {
      await userApi.deleteData();
      await logout();
      router.replace('/login');
    } catch {
      setError('삭제하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="회원 탈퇴" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <p className="m-0 text-[14px] font-semibold text-content">지우면 되돌릴 수 없어요</p>
          </div>
          <ul className="m-0 pl-4 flex flex-col gap-1">
            {ERASED.map((item) => (
              <li key={item} className="text-[12.5px] text-muted leading-[1.5]">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <p className="m-0 text-[12.5px] text-content leading-[1.5]">
            지금은 기록만 지우고 계정은 남아요. 같은 이메일로 다시 로그인하면 빈 상태로 시작해요.
          </p>
          <p className="m-0 mt-2 text-[11.5px] text-muted leading-[1.5]">
            계정 자체를 없애는 건 아직 준비 중이에요. 필요하면 기록을 지운 뒤 문의해 주세요.
          </p>
        </div>

        <div className="px-1">
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label="기록이 모두 지워지고 되돌릴 수 없다는 걸 확인했어요"
          />
        </div>

        {error && <p className="m-0 px-1 text-[12px] text-danger">{error}</p>}

        <button
          type="button"
          onClick={erase}
          disabled={!agreed || busy}
          className="w-full h-14 rounded-[14px] bg-white border-2 border-danger flex items-center justify-center gap-2 text-[15px] font-semibold text-danger transition-colors active:bg-danger/10 disabled:border-danger/35 disabled:text-danger/50 disabled:bg-white/70"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          기록 전부 지우고 로그아웃
        </button>
      </div>
    </PageShell>
  );
}
