package com.habitooth.backend.domain.ai.dto.response;

import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * AiAnalysisService.analyzeSession() 의 반환 타입.
 */
@Getter
@Builder
@Schema(description = "세션 단위 AI 분석 결과")
public class SessionAnalysisResult {

    @Schema(description = "이미지(구역)별 분석 결과 목록")
    private List<AiAnalyzeResponse> imageResults;

    @Schema(description = "구역 단순 평균 세션 점수. 유효 구역이 하나도 없으면 null",
           example = "78.5", nullable = true)
    private Double sessionScore;

    @Schema(description = "점수 집계에 포함된 유효 구역 수", example = "7")
    private Integer validZoneCount;

    @Schema(description = "이번에 촬영/분석을 시도한 전체 구역 수", example = "9")
    private Integer totalZoneCount;

    @Schema(description = "무효 처리된(재촬영 필요) 구역 목록")
    private List<ViewType> invalidZones;

    @Schema(description = "분석 자체가 실패한(재시도 필요) 이미지 개수", example = "0")
    private Integer failedCount;
}