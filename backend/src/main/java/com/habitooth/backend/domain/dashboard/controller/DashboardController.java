package com.habitooth.backend.domain.dashboard.controller;

import com.habitooth.backend.domain.dashboard.dto.response.DashboardReportResponse;
import com.habitooth.backend.domain.dashboard.dto.response.DashboardRiskResponse;
import com.habitooth.backend.domain.dashboard.dto.response.DashboardScoreResponse;
import com.habitooth.backend.domain.dashboard.service.DashboardService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard API", description = "홈 대시보드 API")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "오늘의 구강 점수 조회", description = "가장 최근 완료된 세션 기준 종합 구강 점수를 반환합니다.")
    @GetMapping("/score")
    public ApiResponse<DashboardScoreResponse> getScore(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(dashboardService.getScore(userDetails.getUserId()));
    }

    @Operation(summary = "최근 분석 리포트 조회", description = "가장 최근 완료된 세션의 분석 요약을 반환합니다.")
    @GetMapping("/report")
    public ApiResponse<DashboardReportResponse> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(dashboardService.getReport(userDetails.getUserId()));
    }

    @Operation(summary = "위험 부위 요약 조회", description = "가장 최근 완료된 세션의 치아별 위험 영역 요약을 반환합니다.")
    @GetMapping("/risk")
    public ApiResponse<DashboardRiskResponse> getRisk(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(dashboardService.getRisk(userDetails.getUserId()));
    }
}
