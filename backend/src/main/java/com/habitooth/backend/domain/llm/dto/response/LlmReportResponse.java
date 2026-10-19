package com.habitooth.backend.domain.llm.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
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
