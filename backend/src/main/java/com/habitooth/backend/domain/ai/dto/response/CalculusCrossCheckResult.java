package com.habitooth.backend.domain.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * UV 치태 분석에서 백색광 치석 영역을 치태 후보에서 뺐는지(§5.3)에 대한 진단 정보.
 * analysis_result.calculus_cross_check_json 에 그대로 JSON 으로 저장한다.
 * applied=false 이면 reason 으로 원인(예: "calculus 미실행", "calculus task 없음(...)")을 추적한다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalculusCrossCheckResult {

    private Boolean applied;

    /** 치석 영역을 가져온 백색광 task ID */
    private String sourceTaskId;

    /** 백색광/UV 양쪽에서 FDI 가 대응된 치아. 같은 task 에서 돌린 경우 "same-image" */
    private List<String> matchedTeeth;

    /** 백색광에 치석은 있으나 UV 에서 대응 치아를 못 찾은 FDI */
    private List<String> unmatchedTeeth;

    private String reason;

    /** UV 좌표로 옮긴 치석 마스크 전체 픽셀 수 */
    private Long calculusPixels;

    /** 치아별로 치태 후보에서 뺀 치석 픽셀 수 (plaque-fluorescence toothStatuses[].calculusExcludedPixels) */
    private List<ToothExclusion> teeth;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ToothExclusion {
        private Integer areaId;
        private Integer toothNumber;
        private Integer calculusExcludedPixels;
    }
}
