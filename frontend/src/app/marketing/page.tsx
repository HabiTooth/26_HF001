'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function MarketingPage() {
  const router = useRouter();

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-background px-5 pt-[56px] pb-10 flex flex-col relative z-10">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex items-center mb-6 relative z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center p-1 bg-transparent border-none cursor-pointer text-content"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">
          마케팅 수신 동의
        </h2>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-6 relative z-10 flex flex-col gap-6 text-[14px] text-content leading-relaxed">
        <section>
          <h3 className="text-[15px] font-semibold mb-2">마케팅 정보 수신 동의 안내</h3>
          <p className="text-muted">
            HabiTooth는 더 나은 구강 건강 관리 경험을 위해 다양한 정보와 혜택을 안내드리고자 합니다.
            마케팅 수신에 동의하시면 아래와 같은 정보를 받아보실 수 있습니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">수신 정보 유형</h3>
          <div className="flex flex-col gap-3">
            <div className="bg-[#F5F8FF] rounded-[12px] p-4">
              <p className="font-medium text-[13px] mb-1">구강 건강 케어 팁</p>
              <p className="text-muted text-[13px]">
                올바른 칫솔질 방법, 치실 사용법, 구강 관리 노하우 등 맞춤형 건강 정보를 제공합니다.
              </p>
            </div>
            <div className="bg-[#F5F8FF] rounded-[12px] p-4">
              <p className="font-medium text-[13px] mb-1">스케일링 및 정기검진 리마인더</p>
              <p className="text-muted text-[13px]">
                마지막 스캔 결과를 바탕으로 적절한 치과 방문 시기를 알려드립니다.
              </p>
            </div>
            <div className="bg-[#F5F8FF] rounded-[12px] p-4">
              <p className="font-medium text-[13px] mb-1">서비스 업데이트 및 이벤트</p>
              <p className="text-muted text-[13px]">
                새로운 기능 출시, 이벤트 소식 등 HabiTooth 관련 소식을 전달합니다.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">수신 채널</h3>
          <ul className="text-muted list-disc pl-4 flex flex-col gap-1">
            <li>앱 푸시 알림</li>
            <li>이메일</li>
          </ul>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">수신 거부 방법</h3>
          <p className="text-muted">
            마케팅 수신 동의는 선택 사항이며, 동의 후에도 언제든지 철회하실 수 있습니다.
            앱 내 마이페이지 → 알림 설정에서 수신 여부를 변경하실 수 있습니다.
          </p>
        </section>

        <div className="bg-[#FFF8EC] border border-[#FFB347]/30 rounded-[12px] p-4">
          <p className="text-[13px] text-[#B87C00]">
            마케팅 수신에 동의하지 않아도 서비스의 핵심 기능(구강 분석, 리포트 확인 등)은 정상적으로 이용 가능합니다.
          </p>
        </div>

        <p className="text-[12px] text-muted text-right">시행일: 2026년 6월 25일</p>
      </div>
    </div>
  );
}
