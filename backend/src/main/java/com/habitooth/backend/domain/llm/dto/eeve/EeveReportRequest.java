package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * LLM 리포트 서버(:8001, /api/llm/report/generate) 요청 바디.
 *
 * <p>서버 ReportRequest 스키마(v2): 모든 필드가 선택이라 하나씩 추가해도 동시 배포가 필요 없다.
 * 이 객체가 그대로 직렬화되어 전송되고, 같은 문자열이 {@code llm_report_log.request_json} 에 남는다.
 */
@Getter
@Builder
public class EeveReportRequest {

    /** 이번 세션 종합 점수 (소수 1자리). 서버가 자체 계산한 점수와 교차 검증(scoreMismatch)하는 데 쓴다 */
    private Double totalScore;

    /** 직전 세션 종합 점수. 첫 세션이면 null */
    private Double prevTotalScore;

    /** 촬영한 구역 수 / 전체 구역 수 (예: 4 / 13). 커버리지 경고(LOW_COVERAGE) 판정용 */
    private Integer capturedZoneCount;
    private Integer totalZoneCount;

    /** 행(이미지)당 1개 — 같은 구역을 두 광원으로 찍으면 2줄. 합치지 않고 그대로 보낸다 */
    private List<EeveZone> zones;
    private List<EeveIssue> teeth;

    /** 직전 세션의 zones. 첫 세션이면 null */
    private List<EeveZone> prevZones;

    /** 직전 세션 병변. v1 의 {@code [[toothNumber, lesionType]]} 에서 객체형으로 교체됨 */
    private List<EevePrevIssue> prevTeeth;
}
