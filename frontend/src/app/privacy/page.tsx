'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          개인정보 처리방침
        </h2>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-6 relative z-10 flex flex-col gap-6 text-[14px] text-content leading-relaxed">
        <section>
          <h3 className="text-[15px] font-semibold mb-2">1. 수집하는 개인정보 항목</h3>
          <p className="text-muted mb-2">회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
          <div className="bg-[#F5F8FF] rounded-[12px] p-4 flex flex-col gap-2">
            <div>
              <span className="font-medium text-[13px]">필수 항목</span>
              <p className="text-muted text-[13px] mt-1">이름, 이메일 주소, 비밀번호, 생년월일</p>
            </div>
            <div>
              <span className="font-medium text-[13px]">자동 수집 항목</span>
              <p className="text-muted text-[13px] mt-1">서비스 이용 기록, 구강 촬영 이미지, 분석 결과 데이터</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">2. 개인정보의 수집 및 이용 목적</h3>
          <ul className="text-muted list-disc pl-4 flex flex-col gap-1">
            <li>구강 건강 분석 서비스 제공</li>
            <li>회원 관리 및 본인 확인</li>
            <li>서비스 개선 및 신규 서비스 개발</li>
            <li>법령 준수 및 고지사항 전달</li>
          </ul>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">3. 개인정보의 보유 및 이용 기간</h3>
          <p className="text-muted">
            회원 탈퇴 시 즉시 파기하는 것을 원칙으로 합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우에는
            해당 법령이 정한 기간 동안 보관 후 파기합니다.
          </p>
          <div className="bg-[#F5F8FF] rounded-[12px] p-4 mt-2 flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">계약 및 청약철회 기록</span>
              <span className="font-medium">5년</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">소비자 불만 및 분쟁 기록</span>
              <span className="font-medium">3년</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">4. 개인정보의 제3자 제공</h3>
          <p className="text-muted">
            회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            단, 법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">5. 개인정보 처리의 위탁</h3>
          <p className="text-muted">
            회사는 서비스 향상을 위해 필요한 경우 이용자의 동의를 얻어 개인정보 처리를 외부에 위탁할 수 있습니다.
            위탁 업체 및 업무 내용은 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">6. 이용자의 권리</h3>
          <p className="text-muted">
            이용자는 언제든지 자신의 개인정보를 조회·수정하거나 삭제를 요청할 수 있습니다.
            개인정보 관련 문의는 앱 내 고객센터 또는 이메일을 통해 접수할 수 있습니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">7. 개인정보 보호책임자</h3>
          <div className="bg-[#F5F8FF] rounded-[12px] p-4 text-[13px] flex flex-col gap-1">
            <div className="flex gap-2">
              <span className="text-muted w-20">담당부서</span>
              <span>HabiTooth 개발팀</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted w-20">이메일</span>
              <span>habitooth2233@gmail.com</span>
            </div>
          </div>
        </section>

        <p className="text-[12px] text-muted text-right">시행일: 2026년 6월 25일</p>
      </div>
    </div>
  );
}
