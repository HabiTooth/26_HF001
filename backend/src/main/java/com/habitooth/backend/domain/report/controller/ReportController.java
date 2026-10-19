package com.habitooth.backend.domain.report.controller;

import com.habitooth.backend.domain.ai.dto.response.MeshCoordinateResponse;
import com.habitooth.backend.domain.ai.service.AiAnalysisService;
import com.habitooth.backend.domain.llm.dto.response.LlmReportResponse;
import com.habitooth.backend.domain.llm.service.LlmReportService;
import com.habitooth.backend.domain.report.dto.response.SessionZoneReportResponse;
import com.habitooth.backend.domain.report.dto.response.SingleImageReportResponse;
import com.habitooth.backend.domain.report.service.ReportService;
import com.habitooth.backend.domain.scan.dto.response.SessionReportResponse;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
@Tag(name = "Report API", description = "AI 분석 리포트 조회 관련 API")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;
    private final AiAnalysisService aiAnalysisService;
    private final LlmReportService llmReportService;

    @GetMapping("/scan-images/{scanImageId}")
    @Operation(
            summary = "단일 이미지 최신 AI 분석 리포트 조회",
            description = "scanImageId 기준으로 가장 최근 저장된 AI 분석 결과를 리포트 형태로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "단일 이미지 AI 분석 리포트 조회 성공"
    )
    public ApiResponse<SingleImageReportResponse> getLatestSingleImageReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "촬영 이미지 ID", example = "1")
            @PathVariable Long scanImageId
    ) {
        SingleImageReportResponse response = reportService.getLatestSingleImageReport(userDetails.getUserId(), scanImageId);
        return ApiResponse.success(response);
    }

    @Operation(
            summary = "3D 오버레이용 병변 좌표 조회",
            description = "세션의 병변 polygon 을 치아 FDI 번호 + 표면(surfaceType) + 치아 bbox 기준 (u, v) 좌표로 반환합니다. "
                    + "좌우 반전은 적용돼 있으며, 치아에 매핑되지 않은 병변은 제외됩니다."
    )
    @GetMapping("/scan-sessions/{sessionId}/3d")
    public ApiResponse<MeshCoordinateResponse> get3dMeshCoordinates(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        MeshCoordinateResponse response = aiAnalysisService.getMeshCoordinates(userDetails.getUserId(), sessionId);

        // 데이터가 아직 생성되지 않았거나 비어있으면 AI5009 공통 예외 트리거
        if (response == null || response.getLesions().isEmpty()) {
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY);
        }

        return ApiResponse.success(response);
    }

    @Operation(summary = "세션 분석 심플 리포트(치아별 상태 조회)", description = "FDI 치아 번호별 위험도 수치와 종합 점수")
    @GetMapping("/scan-sessions/{sessionId}/simple")
    public ApiResponse<SessionReportResponse> getSessionReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        SessionReportResponse response = reportService.getSessionSimpleReport(userDetails.getUserId(), sessionId);
        return ApiResponse.success(response);
    }

    @Operation(
            summary = "세션 구역 리포트 조회 (종합 점수 + 13구역 그리드)",
            description = "13구역 전부를 반환합니다. 촬영하지 않은 구역은 captured=false, 분석이 실패했거나 무효인 구역은 zoneScore=null 입니다. "
                    + "zoneScore 는 백색광(치석)·UV(치태) 점수를 합성한 값이고 calculusZoneScore/plaqueZoneScore 로 합성 전 값을 따로 줍니다. "
                    + "sessionScore 는 유효 구역 zoneScore 의 단순 평균(소수 1자리)이며, 구역별 whiteScanImageId/uvScanImageId 로 "
                    + "구역 상세 리포트(/reports/scan-images/{scanImageId})를 이어서 조회할 수 있습니다."
    )
    @GetMapping("/scan-sessions/{sessionId}/zones")
    public ApiResponse<SessionZoneReportResponse> getSessionZoneReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        return ApiResponse.success(reportService.getSessionZoneReport(userDetails.getUserId(), sessionId));
    }

    @Operation(
            summary = "세션 LLM 구강 관리 리포트 조회",
            description = "이미 생성되어 저장된 LLM 리포트를 재생성 없이 조회합니다. EEVE 서버를 호출하지 않아 빠릅니다. " +
                    "아직 생성된 적 없는 세션이면 404를 반환합니다."
    )
    @GetMapping("/scan-sessions/{sessionId}/llm-report")
    public ApiResponse<LlmReportResponse> getLlmReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        LlmReportResponse response = llmReportService.getSessionLlmReport(userDetails.getUserId(), sessionId);
        return ApiResponse.success(response);
    }

    @Operation(
            summary = "세션 LLM 구강 관리 리포트 생성",
            description = "세션에서 검출된 이슈(치석/치태 + 치아번호 + 위험도)를 기반으로 EEVE LLM 서버(:8001)를 호출해 " +
                    "riskDetail/management 리포트를 생성하고 저장합니다. LLM 응답이 수 분 걸릴 수 있습니다."
    )
    @PostMapping("/scan-sessions/{sessionId}/llm-report")
    public ApiResponse<LlmReportResponse> generateLlmReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        LlmReportResponse response = llmReportService.generateSessionLlmReport(userDetails.getUserId(), sessionId);
        return ApiResponse.success(response);
    }

}
