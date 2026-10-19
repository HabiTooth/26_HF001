'use client';

import { Bot, AlertTriangle, AlertCircle, CheckCircle, Loader2, RotateCw } from 'lucide-react';
import { RISK_INK } from '@/lib/riskColors';
import type { LLMGuideSectionProps, GuideType } from './LLMGuideSection.types';

const getColor = (type: GuideType) => {
  if (type === 'warning') return RISK_INK.MEDIUM;
  if (type === 'danger') return RISK_INK.CRITICAL;
  return RISK_INK.LOW;
};

const getIcon = (type: GuideType) => {
  if (type === 'warning') return AlertTriangle;
  if (type === 'danger') return AlertCircle;
  return CheckCircle;
};

export default function LLMGuideSection({
  items,
  isLoading = false,
  generating = false,
  failed = false,
  onRetry,
  onToothClick,
  focusTeeth = [],
}: LLMGuideSectionProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-[#E8ECF4] rounded-full flex items-center justify-center">
          <Bot size={16} className="text-[#4A86D9]" />
        </div>
        <h3 className="text-[15px] font-semibold text-gray-800">AI 가이드</h3>
      </div>
      {focusTeeth.length > 0 && onToothClick && (
        <div className="mb-4">
          <p className="m-0 mb-2 text-[13px] font-semibold text-content">
            신경 쓸 치아 {focusTeeth.length}개
            <span className="ml-1.5 font-normal text-muted">누르면 위 모형에서 자세히 봐요</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {focusTeeth.map((tooth) => (
              <button
                key={tooth.fdi}
                type="button"
                onClick={() => onToothClick(Number(tooth.fdi))}
                className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-[12.5px] font-semibold text-content"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tooth.color }} />
                {tooth.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="bg-[#F8FAFC] rounded-xl p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 size={16} className="animate-spin text-primary" />
            <p className="m-0 text-xs text-muted text-center leading-relaxed">
              {generating ? (
                <>
                  이 스캔은 처음 열어서 AI 가이드를 만들고 있어요.
                  <br />몇 분 걸릴 수 있어요.
                </>
              ) : (
                'AI 가이드를 불러오는 중이에요.'
              )}
            </p>
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center gap-2.5 py-2">
            <p className="m-0 text-xs text-muted text-center leading-relaxed">
              AI 가이드를 못 받아왔어요.
              <br />
              위쪽 분석 결과는 그대로 보셔도 돼요.
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-white text-[11px] font-semibold text-primary"
              >
                <RotateCw size={12} />
                다시 시도
              </button>
            )}
          </div>
        ) : items.length === 0 ? (
          <p className="m-0 text-xs text-muted text-center">아직 가이드가 없어요.</p>
        ) : (
          items.map((item, index) => {
            const Icon = getIcon(item.type);
            return (
              <div key={index} className="flex gap-2">
                <Icon
                  size={16}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: getColor(item.type) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-800 mb-0.5">{item.title}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{item.description}</p>
                  {item.tooth !== undefined && onToothClick && (
                    <button
                      type="button"
                      onClick={() => onToothClick(item.tooth!)}
                      className="mt-1 text-[12px] font-semibold text-primary"
                    >
                      {item.tooth}번 3D에서 보기
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
