package com.habitooth.backend.domain.llm.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.llm.dto.LlmReportPayload;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "세션 LLM 구강 관리 리포트 응답")
public class LlmReportResponse {

    @Schema(description = "촬영 세션 ID", example = "1")
    private Long sessionId;

    @Schema(description = "부위별 위험도 상세 설명")
    private List<RiskDetail> riskDetail;

    @Schema(description = "관리법 3가지")
    private List<Management> management;

    @Schema(description = "면책 문구")
    private String disclaimer;

    // ---------------------------------------------------------------------
    // v2 확장 필드. llm_report.report_json 에서 복원한다.
    // report_json 이 없는 구버전 행은 전부 null 로 내려간다 — 위 세 필드는 그대로 채워진다.
    // ---------------------------------------------------------------------

    @Schema(description = "점수 분해(v2). 구버전 리포트는 null", nullable = true)
    private LlmReportPayload.Score score;

    @Schema(description = "해설 문장 목록(v2). 구버전 리포트는 null", nullable = true)
    private List<String> interpretation;

    @Schema(description = "해설 생성 출처(v2). 예: llm / template", example = "llm", nullable = true)
    private String interpretationSource;

    @Schema(description = "권장 행동 목록(v2). 구버전 리포트는 null", nullable = true)
    private List<LlmReportPayload.Action> actions;

    @Schema(description = "안내 문구(v2). 서버가 보냈을 때만 존재", nullable = true)
    private String notice;

    @Schema(description = "LLM 서버 산식 버전(v2)", example = "2026-10-17-score-v2.8", nullable = true)
    private String logicVersion;

    @Getter
    @Builder
    public static class RiskDetail {
        @Schema(description = "부위 제목", example = "오른쪽 위 어금니 치석")
        private String title;
        @Schema(description = "설명 문장")
        private String detail;
        @Schema(description = "위험도 레벨", example = "HIGH")
        private RiskLevel riskLevel;
    }

    @Getter
    @Builder
    public static class Management {
        @Schema(description = "관리법 이름", example = "치과 스케일링")
        private String title;
        @Schema(description = "구체적 실천법")
        private String detail;
    }
}
