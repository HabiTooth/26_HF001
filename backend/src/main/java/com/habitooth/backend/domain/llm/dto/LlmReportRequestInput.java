package com.habitooth.backend.domain.llm.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * LLM 리포트 서버 요청 1건의 입력 전체.
 *
 * <p>v1 에서는 {@code zones / teeth / prevTeeth} 세 리스트를 서비스 → 인터페이스 → 클라이언트로
 * 평행 전달했는데, v2 에서 점수·직전 세션·촬영 구역 수까지 붙으면서 인자가 8개가 되어 묶었다.
 * 필드를 추가할 때 {@link com.habitooth.backend.domain.llm.client.LlmReportClient} 시그니처는
 * 더 이상 건드리지 않는다.
 *
 * <p>LLM 서버는 모든 필드를 선택으로 받으므로, 값이 없으면 null 로 보내도 된다
 * (첫 세션의 {@code prevTotalScore / prevZones / prevTeeth}).
 */
@Getter
@Builder
public class LlmReportRequestInput {

    /** 이번 세션 종합 점수. ScoreCalculator v2.3 산식, 반올림 전 소수 1자리. 유효 구역이 없으면 null */
    private Double totalScore;

    /** 직전 COMPLETED 세션의 종합 점수. 같은 산식. 첫 세션이면 null */
    private Double prevTotalScore;

    /** 이번 세션에서 촬영한 구역 수 (한 구역을 백색광·UV 로 찍어도 1) */
    private Integer capturedZoneCount;

    /** 전체 구역 수 (ViewType.values().length = 13) */
    private Integer totalZoneCount;

    /** 구역별 최신 SUCCESS 분석 결과. 행(이미지) 1개당 1개 — 광원별로 2줄이 된다 */
    private List<LlmZoneInput> zones;

    /** 이번 세션에서 검출된 치아 단위 병변 */
    private List<LlmIssueInput> teeth;

    /** 직전 세션의 zones. 첫 세션이면 null */
    private List<LlmZoneInput> prevZones;

    /** 직전 세션의 치아 병변. 첫 세션이면 null */
    private List<LlmPrevIssueInput> prevTeeth;
}
