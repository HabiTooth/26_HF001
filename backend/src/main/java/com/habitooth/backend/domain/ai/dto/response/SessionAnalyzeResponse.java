package com.habitooth.backend.domain.ai.dto.response;

import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "세션 단위 AI 분석 최종 응답 DTO")
public class SessionAnalyzeResponse {

    @Schema(description = "촬영 세션 ID", example = "12")
    private Long sessionId;

    @Schema(
            description = "세션 종합 점수 (촬영한 구역의 zoneScore 를 단순 평균). "
                    + "유효 구역이 하나도 없으면 null. "
                    + "⚠️ '이번에 찍은 구역'만의 점수이므로 validZoneCount 와 함께 표시할 것",
            example = "78.5",
            nullable = true
    )
    private Integer sessionScore;

    @Schema(description = "점수 집계에 포함된 유효 구역 수", example = "9")
    private Integer validZoneCount;

    @Schema(description = "이번에 분석을 시도한 전체 구역 수. 한 구역을 백색광·UV 두 장 찍어도 1로 센다.",
            example = "13")
    private Integer totalZoneCount;

    @Schema(description = "무효 처리된(재촬영 권장) 구역 목록")
    private List<ViewType> invalidZones;

    @Schema(description = "분석 자체가 실패한 이미지 개수", example = "0")
    private Integer failedCount;

    @Schema(description = "세션 내 각 이미지(구역)별 AI 분석 결과 목록")
    private List<AiAnalyzeResponse> analysisResults;

    public static SessionAnalyzeResponse from(Long sessionId, SessionAnalysisResult result) {
        return SessionAnalyzeResponse.builder()
                .sessionId(sessionId)
                // 내부(SessionAnalysisResult)는 소수로 계산하고 응답에서만 정수로 반올림한다.
                .sessionScore(ScoreCalculator.roundScore(result.getSessionScore()))
                .validZoneCount(result.getValidZoneCount())
                .totalZoneCount(result.getTotalZoneCount())
                .invalidZones(result.getInvalidZones())
                .failedCount(result.getFailedCount())
                .analysisResults(result.getImageResults())
                .build();
    }
}
