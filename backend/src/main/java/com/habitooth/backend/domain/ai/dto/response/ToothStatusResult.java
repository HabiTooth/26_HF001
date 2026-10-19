package com.habitooth.backend.domain.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;

@Getter
@Builder
@Schema(description = "치아 단위 분석 결과")
public class ToothStatusResult {

    @Schema(description = "치아 FDI 번호", example = "41")
    private Integer toothNumber;

    @Schema(description = "3D 치아 템플릿 매핑 ID", example = "tooth_41")
    private String templateRegionId;

    @Schema(description = "검출 상태. NOT_DETECTED/SKIPPED 치아는 areaRatio·riskLevel 이 null 이고 채점에서 제외된다",
            example = "DETECTED")
    private ToothDetectionStatus status;

    @Schema(description = "병변 종류. 병변 없으면 null", example = "CALCULUS", nullable = true)
    private LesionType lesionType;

    @Schema(description = "치아 면적 대비 병변 면적 비율(%). 미검출 치아는 null", example = "19.3", nullable = true)
    private Double areaRatio;

    /**
     * FastAPI 가 계산한 치아 점수. DB(analysis_tooth_area.tooth_score) 저장용이며
     * 프론트 응답 형태는 바꾸지 않기 위해 JSON 에서는 제외한다.
     */
    @JsonIgnore
    private Double toothScore;

    @Schema(description = "위험 단계", example = "HIGH")
    private RiskLevel riskLevel;
}