package com.habitooth.backend.domain.report.dto.response;

import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(description = "단일 이미지 AI 분석 리포트 응답 DTO")
public class SingleImageReportResponse {

    @Schema(description = "분석 결과 ID", example = "1")
    private Long analysisResultId;

    @Schema(description = "촬영 이미지 ID", example = "1")
    private Long scanImageId;

    @Schema(description = "AI 분석 태스크 ID", example = "task_abc123")
    private String taskId;

    @Schema(description = "분석 상태", example = "SUCCESS")
    private AnalysisStatus analysisStatus;

    @Schema(description = "촬영 구역", example = "UPPER_FRONT")
    private ViewType viewType;

    @Schema(description = "구역 점수(zoneScore, 정수). 백색광은 치석, UV 는 치태 기준. 무효 구역이면 null",
            example = "83", nullable = true)
    private Integer totalScore;

    @Schema(description = "AI 추천 문구", example = "치석 의심 부위가 있어 꼼꼼한 관리가 필요합니다.")
    private String recommendation;

    @Schema(description = "치아 영역 분석 결과")
    private List<ReportToothAreaResponse> teeth;

    @Schema(description = "치석/치태 탐지 결과")
    private List<ReportDetectedIssueResponse> issues;

    @Schema(description = "분석 결과 생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "원본 사진 파일 API 경로. 인증 헤더를 붙여 GET 하면 이미지(S3 면 presigned URL 로 302)",
            example = "/api/scan-images/1/file")
    private String imageFileUrl;

    @Schema(description = "분석 오버레이(PNG) 파일 API 경로. 백색광=치석, UV=치태 오버레이. 오버레이가 없으면 null",
            example = "/api/scan-images/1/overlay", nullable = true)
    private String overlayFileUrl;
}