package com.habitooth.backend.domain.report.dto.response;

import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.JawType;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "리포트 치아 영역 응답 DTO")
public class ReportToothAreaResponse {
 
    @Schema(description = "치아 영역 ID", example = "1")
    private Integer areaId;
 
    @Schema(description = "치아 번호 또는 임시 탐지 인덱스", example = "1")
    private Integer toothNumber;
 
    @Schema(description = "3D 템플릿 region ID", example = "tooth_1")
    private String templateRegionId;
 
    @Schema(description = "턱 구분 (UPPER/LOWER)")
    private JawType jawType;
 
    @Schema(description = "치아 표면 구분 (OUTER/INNER)")
    private SurfaceType surfaceType;
 
    @Schema(description = "촬영 구역", example = "UPPER_FRONT")
    private ViewType viewType;
    
    @Schema(description = "검출 상태. NOT_DETECTED 는 사진에 잡히지 않은 기대 치아(재촬영 안내), "
            + "SKIPPED 는 UV 유효 픽셀 부족. 둘 다 areaRatio/toothScore/riskLevel 이 null", example = "DETECTED")
    private ToothDetectionStatus status;

    @Schema(description = "대표 병변 종류. 병변 없으면 null", example = "CALCULUS", nullable = true)
    private LesionType lesionType;
 
    @Schema(description = "치아 면적 대비 병변 면적 비율(%)", example = "19.3")
    private Double areaRatio;
 
    @Schema(description = "치아 점수 (100 - DAMAGE_K × areaRatio), 정수. 미검출 치아는 null", example = "42", nullable = true)
    private Integer toothScore;
 
    @Schema(description = "위험 단계", example = "DANGER")
    private RiskLevel riskLevel;
}
 