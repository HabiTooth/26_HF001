package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * UV 형광 기반 치아별 치태 분석 결과 (/api/ai/predict/plaque-fluorescence).
 *
 * <p>모델 기반 {@link FastApiToothStatus} 와 달리 riskLevel 을 주지 않으므로
 * Spring 이 {@code plaqueRatio} 로부터 직접 판정한다.
 * {@code skipped=true} 는 치아 픽셀이 너무 적어 비율 산출이 불가능했다는 뜻이라
 * 채점 대상에서 제외해야 한다(비율 0% 인 정상 치아와 구분됨).
 */
@Getter
@NoArgsConstructor
public class FastApiFluorescenceToothStatus {
    private Integer areaId;
    private Integer toothNumber;
    /** 2.3: 촬영면(INNER/OUTER) */
    private String surface;
    /** 2.3: DETECTED / NOT_DETECTED / SKIPPED. 구버전은 null → skipped 플래그로 판정한다. */
    private String status;
    /** 2.3: FastAPI 가 치석과 같은 산식으로 계산한 치아 점수. DETECTED 가 아니면 null. 구버전은 null → Spring 계산. */
    private Double toothScore;
    /** 2.3: DETECTED 가 아니면 "UNKNOWN". 구버전은 null → Spring 판정. */
    private String riskLevel;
    private Double plaqueRatio;
    private Integer pixelCount;
    private Integer flaggedPixels;
    @JsonProperty("skipped")
    private Boolean skipped;
    /** v12: 백색광 치석 영역과 겹쳐 FastAPI 가 이미 치태 후보에서 뺀 픽셀 수 */
    private Integer calculusExcludedPixels;
    /** v12: 치석과 겹친 영역은 FastAPI 가 이미 제외한 상태로 온다(Spring 에서 다시 빼지 않는다). */
    private List<FastApiPlaqueRegion> plaqueRegions;
}
