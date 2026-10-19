export default function ScanExitModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213D60]/35 backdrop-blur-sm px-6">
      <div role="dialog" aria-modal="true" aria-labelledby="scan-exit-title" className="bg-white rounded-[24px] shadow-xl w-full max-w-[340px] overflow-hidden">
        <div className="px-6 pt-6 pb-5 text-center">
          <h3 id="scan-exit-title" className="m-0 text-[20px] font-bold text-content">스캔을 중단할까요?</h3>
          <p className="m-0 mt-2 text-[14px] font-medium text-[#687B94] leading-relaxed">
            지금까지 촬영한 데이터가 모두 삭제됩니다.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-[14px] text-[15px] font-bold text-white bg-primary-gradient"
          >
            계속 촬영
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-12 rounded-[14px] text-[15px] font-bold text-danger bg-[#FFF1F0]"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
