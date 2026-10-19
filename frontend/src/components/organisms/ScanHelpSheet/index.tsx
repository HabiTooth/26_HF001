import { X } from 'lucide-react';
import { SCAN_STATUS, SCAN_STATUS_ORDER } from '@/constants/scanStatus';

export default function ScanHelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#213D60]/35 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="scan-help-title" className="bg-white rounded-t-[28px] w-full max-w-app max-h-[calc(85svh/var(--app-zoom))] overflow-y-auto pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-hairline rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-hairline">
          <span id="scan-help-title" className="text-[18px] font-bold text-content">상태 안내</span>
          <button
            type="button"
            aria-label="상태 안내 닫기"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-hairline"
          >
            <X size={16} className="text-content" />
          </button>
        </div>
        <div className="px-5 pt-4 flex flex-col gap-4">
          {SCAN_STATUS_ORDER.map((status) => {
            const { Icon, textColor, label, sub } = SCAN_STATUS[status];
            return (
              <div key={status} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[12px] bg-[#EEF5FF] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className={textColor} />
                </div>
                <div>
                  <p className="m-0 text-[15px] font-bold text-content">{label}</p>
                  <p className="m-0 text-[14px] font-medium text-[#687B94] mt-1 leading-relaxed">{sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
