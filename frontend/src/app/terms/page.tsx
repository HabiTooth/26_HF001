'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
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
          이용약관
        </h2>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-6 relative z-10 flex flex-col gap-6 text-[14px] text-content leading-relaxed">
        <section>
          <h3 className="text-[15px] font-semibold mb-2">제1조 (목적)</h3>
          <p className="text-muted">
            이 약관은 HabiTooth(이하 &quot;회사&quot;)가 제공하는 구강 건강 관리 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여
            회사와 이용자 간의 권리·의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제2조 (정의)</h3>
          <p className="text-muted">
            &quot;서비스&quot;란 회사가 제공하는 AI 기반 구강 분석, 구강 건강 리포트, 관리 가이드 등 일체의 서비스를 의미합니다.
            &quot;이용자&quot;란 이 약관에 따라 회사와 서비스 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 회원을 말합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제3조 (약관의 효력 및 변경)</h3>
          <p className="text-muted">
            ① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.<br />
            ② 회사는 합리적인 사유가 있는 경우 이 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 지나면 효력이 발생합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제4조 (서비스 이용)</h3>
          <p className="text-muted">
            ① 서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴 24시간 제공을 원칙으로 합니다.<br />
            ② 회사는 서비스의 제공에 필요한 경우 정기 점검을 실시할 수 있으며, 이 경우 사전에 공지합니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제5조 (이용자의 의무)</h3>
          <p className="text-muted">
            이용자는 다음 행위를 하여서는 안 됩니다.
          </p>
          <ul className="text-muted list-disc pl-4 mt-1 flex flex-col gap-1">
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 허가 없는 변경</li>
            <li>회사 및 제3자의 저작권 등 지식재산권 침해</li>
            <li>서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제·유통하는 행위</li>
          </ul>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제6조 (면책 조항)</h3>
          <p className="text-muted">
            ① 본 서비스가 제공하는 구강 분석 결과는 AI 기반의 참고 정보이며, 의료적 진단을 대체하지 않습니다.
            정확한 진단 및 치료는 반드시 치과 전문의와 상담하시기 바랍니다.<br />
            ② 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold mb-2">제7조 (분쟁 해결)</h3>
          <p className="text-muted">
            서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 회사는 분쟁의 해결을 위해 성실히 협의합니다.
            협의가 이루어지지 않을 경우, 관련 법령에 따른 분쟁 조정 기관에 조정을 신청할 수 있습니다.
          </p>
        </section>

        <p className="text-[12px] text-muted text-right">시행일: 2026년 6월 25일</p>
      </div>
    </div>
  );
}
