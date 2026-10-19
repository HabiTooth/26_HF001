package com.habitooth.backend.domain.llm.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

import java.util.List;

/**
 * LLM 서버 응답 {@code result} 의 v2 확장부.
 *
 * <p>{@code llm_report.report_json} 에 저장된 원문을 이 타입으로 역직렬화해 API 응답에 싣는다.
 * 기존 세 필드(riskDetail / management / disclaimer)는 전용 컬럼에 그대로 남아 있어 여기 없다.
 *
 * <p>모든 필드가 nullable 이다 — 구버전 행은 {@code report_json} 자체가 null 이고, 서버가
 * 일부 필드를 생략할 수도 있다. 알 수 없는 필드는 무시해서, 서버가 필드를 더 붙여도
 * 조회가 깨지지 않는다(원문은 report_json 에 그대로 남는다).
 */
@Getter
@Builder
@Jacksonized
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "LLM 리포트 v2 확장 payload")
public class LlmReportPayload {

    private Score score;
    private List<String> interpretation;
    private String interpretationSource;
    private List<Action> actions;
    private String logicVersion;
    private String notice;

    @Getter
    @Builder
    @Jacksonized
    @JsonIgnoreProperties(ignoreUnknown = true)
    @Schema(description = "점수 분해")
    public static class Score {

        @Schema(description = "이번 종합 점수", example = "87")
        private Integer total;
        @Schema(description = "직전 종합 점수. 첫 세션이면 null", example = "96", nullable = true)
        private Integer prevTotal;
        @Schema(description = "total - prevTotal", example = "-9", nullable = true)
        private Integer delta;

        @Schema(description = "치석 감점", example = "12")
        private Integer calculusDeduction;
        @Schema(description = "치태 감점", example = "1")
        private Integer plaqueDeduction;
        @Schema(description = "총 감점", example = "13")
        private Integer totalDeduction;

        @Schema(description = "칫솔질로 회복 가능한 점수", example = "1")
        private Integer recoverableByBrushing;
        @Schema(description = "칫솔질만으로 도달 가능한 상한", example = "88")
        private Integer ceilingByBrushing;
        @Schema(description = "스케일링 후 도달 가능한 상한", example = "99")
        private Integer ceilingAfterScaling;

        @Schema(description = "치석이 검출된 치아 수", example = "4")
        private Integer calculusToothCount;
        @Schema(description = "치태가 검출된 치아 수", example = "2")
        private Integer plaqueToothCount;
        @Schema(description = "검출된 치아 수", example = "14")
        private Integer detectedToothCount;

        @Schema(description = "촬영한 구역 수", example = "3")
        private Integer capturedZoneCount;
        @Schema(description = "전체 구역 수", example = "13")
        private Integer totalZoneCount;

        @Schema(description = "점수를 가장 크게 움직인 사유 코드", example = "NEW_CALCULUS")
        private String primaryReason;
        @Schema(description = "경고 플래그", example = "[\"LOW_COVERAGE\",\"WORSENING\"]")
        private List<String> flags;
        @Schema(description = "산식 설명 문장")
        private String formulaText;

        @Schema(description = "구역별 점수·감점")
        private List<ScoreZone> zones;

        /**
         * Spring 종합 점수와 서버 계산이 어긋났을 때만 채워지는 진단값. 스키마가 열려 있어
         * (문자열/객체 모두 가능) 원문 그대로 통과시킨다. 정상이면 null.
         */
        @Schema(description = "점수 불일치 진단. 정상이면 null", nullable = true)
        private Object scoreMismatch;
    }

    @Getter
    @Builder
    @Jacksonized
    @JsonIgnoreProperties(ignoreUnknown = true)
    @Schema(description = "구역 1개의 점수·감점")
    public static class ScoreZone {

        @Schema(description = "구역", example = "LOWER_FRONT")
        private String viewType;
        @Schema(description = "사용자 노출용 구역 이름", example = "아래 앞니 안쪽")
        private String name;
        @Schema(description = "구역 점수", example = "80")
        private Integer score;
        @Schema(description = "치석 감점", example = "20")
        private Integer calculusDeduction;
        @Schema(description = "치태 감점", example = "0")
        private Integer plaqueDeduction;
    }

    @Getter
    @Builder
    @Jacksonized
    @JsonIgnoreProperties(ignoreUnknown = true)
    @Schema(description = "권장 행동")
    public static class Action {

        @Schema(description = "행동 코드", example = "SCALING")
        private String code;
        @Schema(description = "제목", example = "치과 스케일링 예약")
        private String title;
        @Schema(description = "구체적 실천법")
        private String detail;
        @Schema(description = "화면 배지 문구", example = "+12점")
        private String tag;
        @Schema(description = "기대 회복 점수", example = "12")
        private Integer points;
    }
}
