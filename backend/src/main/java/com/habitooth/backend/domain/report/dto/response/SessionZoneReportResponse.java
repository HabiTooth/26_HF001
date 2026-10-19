package com.habitooth.backend.domain.report.dto.response;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 세션 리포트 첫 화면(종합 점수 + 13구역 그리드)을 한 번에 채우기 위한 응답.
 *
 * <p>구역은 항상 13개 전부 내려간다. 촬영하지 않은 구역은 {@code captured=false} 로,
 * 촬영했지만 분석이 실패했거나 무효(FDI 확정 치아 3개 미만)인 구역은 {@code zoneScore=null} 로 구분한다.
 */
@Getter
@Builder
@Schema(description = "세션 구역 리포트 (13구역 점수 그리드 + 종합 점수)")
public class SessionZoneReportResponse {

    @Schema(description = "촬영 세션 ID", example = "127")
    private Long sessionId;

    @Schema(description = "촬영 시작 시각")
    private LocalDateTime scannedAt;

    @Schema(description = "세션 종합 점수 = 유효 구역 zoneScore 의 단순 평균(정수). 유효 구역이 없으면 null",
            example = "83", nullable = true)
    private Integer sessionScore;

    @Schema(description = "점수에 포함된 유효 구역 수", example = "4")
    private Integer validZoneCount;

    @Schema(description = "이번 세션에서 촬영한 구역 수 (한 구역을 두 광원으로 찍어도 1)", example = "4")
    private Integer capturedZoneCount;

    @Schema(description = "전체 구역 수", example = "13")
    private Integer totalZoneCount;

    @Schema(description = "검출된 FDI 확정 치아 수. 여러 구역에 걸친 같은 치아는 1개로 센다(미검출 행 제외)", example = "17")
    private Integer confirmedToothCount;

    @Schema(description = "구역별 검출 치아 수의 합. UI 의 '확인한 치아 n / m' 의 n. 구버전 분석 결과만 있으면 null",
            example = "17", nullable = true)
    private Integer detectedToothCount;

    @Schema(description = "구역별 기대 치아 수(핵심 시퀀스 − 결손치)의 합. UI 의 '확인한 치아 n / m' 의 m. "
            + "FastAPI 2.3 이전 결과만 있으면 null", example = "20", nullable = true)
    private Integer expectedToothCount;

    @Schema(description = "치석이 검출된 치아 수 (areaRatio > 0, 중복 제거)", example = "4")
    private Integer calculusToothCount;

    @Schema(description = "치태가 검출된 치아 수 (areaRatio > 0, 중복 제거)", example = "7")
    private Integer plaqueToothCount;

    @Schema(description = "13구역 목록. ViewType 선언 순서(상악 설측 → 하악 설측 → 외측)")
    private List<ZoneReport> zones;

    @Getter
    @Builder
    @Schema(description = "구역 1개의 점수와 촬영 정보")
    public static class ZoneReport {

        @Schema(description = "구역", example = "LOWER_FRONT")
        private ViewType viewType;

        @Schema(description = "이 구역이 찍는 치아 표면. 설측 10구역=INNER, 외측 3구역=OUTER", example = "INNER")
        private SurfaceType surfaceType;

        @Schema(description = "이번 세션에서 촬영했는지", example = "true")
        private Boolean captured;

        @Schema(description = "촬영한 광원 목록. 미촬영이면 빈 배열", example = "[\"WHITE_LIGHT\", \"UV_LIGHT\"]")
        private List<LightType> lightTypes;

        @Schema(description = "백색광 이미지 ID. 구역 상세 리포트(/reports/scan-images/{id}) 조회용. 없으면 null",
                example = "301", nullable = true)
        private Long whiteScanImageId;

        @Schema(description = "UV 이미지 ID. 없으면 null", example = "302", nullable = true)
        private Long uvScanImageId;

        @Schema(description = "구역 점수. 치석 점수와 치태 점수를 합성한 값(100 − 치석 감점 − 0.6 × 치태 감점). "
                + "미촬영·분석 실패·무효 구역은 null. 정수", example = "83", nullable = true)
        private Integer zoneScore;

        @Schema(description = "zoneScore 가 있어 종합 점수에 포함됐는지", example = "true")
        private Boolean zoneValid;

        @Schema(description = "백색광(치석) 구역 점수 = 치아 점수 단순 평균(정수). 백색광 미촬영이면 null",
                example = "85", nullable = true)
        private Integer calculusZoneScore;

        @Schema(description = "UV(치태) 구역 점수 = 치아 점수 단순 평균(정수). UV 미촬영이면 null",
                example = "96", nullable = true)
        private Integer plaqueZoneScore;

        @Schema(description = "FDI 번호가 확정된 치아 수. 백색광 결과 우선, 없으면 UV 결과", example = "5", nullable = true)
        private Integer detectedToothCount;

        @Schema(description = "이 구역의 기대 치아 수(핵심 시퀀스 − 결손치). '5 / 6 확인' 의 6. 구버전 결과면 null",
                example = "6", nullable = true)
        private Integer expectedToothCount;

        @Schema(description = "검출 / 기대 치아 비율. FastAPI 는 0.6 미만이면 구역을 무효로 본다", example = "0.833", nullable = true)
        private Double coverageRatio;
    }
}
