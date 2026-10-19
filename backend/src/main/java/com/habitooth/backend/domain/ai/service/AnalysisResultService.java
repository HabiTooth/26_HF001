package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.converter.AiAnalysisConverter;
import com.habitooth.backend.domain.ai.dto.response.AiAnalyzeResponse;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalysisResultService {

    private final AnalysisResultRepository analysisResultRepository;
    private final ScanImageService scanImageService;

    @Transactional
    public AnalysisResult save(Long userId, Long scanImageId, AiAnalyzeResponse response) {
        validateResponse(response);

        ScanImage scanImage = scanImageService.getScanImage(userId, scanImageId);

        AnalysisResult analysisResult = AiAnalysisConverter.toAnalysisResult(
                scanImage,
                response
        );

        return analysisResultRepository.save(analysisResult);
    }

    @Transactional(readOnly = true)
    public AnalysisResult getLatestByScanImageId(Long scanImageId) {
        return analysisResultRepository.findTopByScanImageIdOrderByCreatedAtDesc(scanImageId)
                .orElseThrow(() -> new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY));
    }

    private void validateResponse(AiAnalyzeResponse response) {
        if (response == null) {
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY);
        }

        // polygon 기반 teeth 는 프론트/저장 정본에서 빠질 예정이므로 검증 기준으로 쓰지 않는다.
        // 치아 상태의 정본은 toothStatuses(= AnalysisToothArea) 이고, 그것이 비었을 때만
        // FDI 번호가 하나도 안 잡힌 것으로 보고 실패 처리한다.
        boolean hasToothStatus = response.getToothStatuses() != null
                && !response.getToothStatuses().isEmpty();
        boolean hasDetectedTeeth = response.getDetectedToothCount() != null
                && response.getDetectedToothCount() > 0;

        if (!hasToothStatus && !hasDetectedTeeth) {
            throw new AiAnalysisHandler(ErrorCode.AI_TOOTH_AREA_EMPTY);
        }
    }
}