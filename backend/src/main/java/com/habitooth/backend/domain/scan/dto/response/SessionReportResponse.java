package com.habitooth.backend.domain.scan.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
@Schema(description = "치아 단위 시각화 및 종합 분석 리포트 응답")
public class SessionReportResponse {

    @Schema(description = "촬영 세션 ID", example = "1")
    private Long sessionId;

    @Schema(description = "세션 종합 점수 (100점 만점, 정수). 유효 구역이 없으면 0", example = "83")
    private Integer totalScore;

    @Schema(description = "전체 치아 대비 병변 통계 요약")
    private ReportSummary summary;

    @Schema(description = "3D 치아 모델 오버레이용 FDI 치아별 상태 목록")
    private List<ToothStatusData> toothStatuses;


    @Getter
    @Builder
    public static class ReportSummary {
        @Schema(description = "종합 치태 면적 비율(%)", example = "12.0")
        private Float totalPlaqueRatio;
        @Schema(description = "종합 치석 면적 비율(%)", example = "5.0")
        private Float totalCalculusRatio;
    }

    @Getter
    @Builder
    public static class ToothStatusData {
        @Schema(description = "실제 표준 FDI 치아 번호", example = "16")
        private Integer toothNumber;
        @Schema(description = "주요 탐지 병변 종류", example = "CALCULUS")
        private String lesionType;
        @Schema(description = "해당 치아 내 병변 점유 수치(%)", example = "15.5")
        private Float areaRatio;
        @Schema(description = "위험도 레벨", example = "DANGER")
        private String riskLevel; // HEALTHY, WARNING, DANGER
    }

}