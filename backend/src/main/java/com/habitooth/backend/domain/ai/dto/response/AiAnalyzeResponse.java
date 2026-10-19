package com.habitooth.backend.domain.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder(toBuilder = true)
@Schema(description = "AI 분석 응답 DTO (이미지 1장 = 구역 1개)")
public class AiAnalyzeResponse {

    @Schema(description = "저장된 분석 결과의 DB ID", example = "42")
    private Long analysisResultId;

    @Schema(description = "분석한 촬영 이미지 ID", example = "1")
    private Long scanImageId;

    /**
     * Spring 내부 추적용.
     * 프론트에는 FastAPI task ID를 노출할 필요가 없으므로 JSON에서 제외한다.
     */
    @JsonIgnore
    private String taskId;

    @Schema(description = "촬영 구역 타입", example = "UPPER_FRONT")
    private ViewType viewType;

    @Schema(description = "분석 상태", example = "COMPLETED")
    private String status;
    
    /**
     * 하위 호환용 내부 필드.
     * polygon 기반 원시 치아 영역은 더 이상 프론트 응답에 노출하지 않는다.
     */
    @JsonIgnore
    private List<ToothAreaResult> teeth;


    @JsonIgnore
    private List<DetectedIssueResult> issues;

    @Deprecated
    @JsonIgnore
    private Integer totalScore;

    /**
     * 구역 점수 원본(소수). 치석·치태 합성과 세션 평균 계산에 그대로 쓰이므로 내부에서는 소수를 유지하고,
     * JSON 에는 {@link #getZoneScoreForApi()} 가 정수로 내보낸다.
     */
    @JsonIgnore
    private Double zoneScore;

    @JsonProperty("zoneScore")
    @Schema(
            name = "zoneScore",
            description = "구역 점수(정수). 백색광 이미지는 FastAPI(report.zoneScore) 값, "
                    + "UV 이미지는 2.3 이면 FastAPI 값·구버전이면 Spring 계산값. 점수를 산출하지 못하면 null",
            example = "72",
            nullable = true
    )
    public Integer getZoneScoreForApi() {
        return zoneScore == null ? null : (int) Math.round(zoneScore);
    }

    @Schema(description = "구역 점수 유효 여부 (FDI 확정 치아 3개 이상)", example = "true")
    private Boolean zoneValid;

    @Schema(description = "이 이미지에서 검출된 치아 개수", example = "8")
    private Integer detectedToothCount;

    @Schema(description = "구역의 기대 치아 수(핵심 시퀀스 − 결손치). 구버전 FastAPI 응답이면 null",
            example = "6", nullable = true)
    private Integer expectedToothCount;

    @Schema(description = "검출 치아 / 기대 치아. 0.6 미만이면 구역 무효", example = "0.833", nullable = true)
    private Double coverageRatio;

    @Schema(description = "점수 산식 버전", example = "2.2")
    private String scoreVersion;

    @Schema(description = "치아 전체 면적 대비 치석 비율(%)", example = "10.8")
    private Double totalCalculusRatio;

    @Schema(description = "치아 전체 면적 대비 치태 비율(%)", example = "0.0")
    private Double totalPlaqueRatio;

    @Schema(description = "FDI 확정 치아별 상태 목록. 정상 치아도 areaRatio=0, riskLevel=VERY_LOW로 포함")
    private List<ToothStatusResult> toothStatuses;

    /**
     * 현재 FastAPI가 제공하지 않는 레거시 필드.
     * 다른 서비스와의 소스 호환성만 유지하고 프론트에는 노출하지 않는다.
     */
    @JsonIgnore
    private String recommendation;

    /**
     * UV 이미지의 백색광 치석 2차 검증 결과. DB(analysis_result.calculus_cross_check_json)
     * 저장용이며 프론트 응답 형태는 바꾸지 않는다. 백색광 이미지는 null.
     */
    @JsonIgnore
    private CalculusCrossCheckResult calculusCrossCheck;

    /**
     * FastAPI 가 함께 돌려준 결과 오버레이 PNG
     */
    @JsonIgnore
    private OverlayImageResult overlay;
}