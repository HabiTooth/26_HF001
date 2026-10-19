package com.habitooth.backend.domain.history.controller;

import com.habitooth.backend.domain.history.dto.HistoryPeriodFilter;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.history.dto.HistoryScoreFilter;
import com.habitooth.backend.domain.history.dto.response.HistoryListResponse;
import com.habitooth.backend.domain.history.dto.response.HistoryRecordItem;
import com.habitooth.backend.domain.history.dto.response.HistoryScoreTrendItem;
import com.habitooth.backend.domain.history.dto.response.HistoryTodayResponse;
import com.habitooth.backend.domain.history.dto.response.ToothTrendItem;
import com.habitooth.backend.domain.history.dto.response.ZoneScoreTrendItem;
import com.habitooth.backend.domain.history.service.HistoryService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
@Tag(name = "History API", description = "기록 페이지 API")
@SecurityRequirement(name = "bearerAuth")
public class HistoryController {

    private final HistoryService historyService;

    @Operation(summary = "최근 분석 결과 조회", description = "가장 최근 측정일의 세션 ID, 점수, 위험도, 직전 측정일 대비 점수 등락을 반환합니다. 같은 날 여러 번 측정한 경우 그날 최신 세션을 기준으로 합니다.")
    @GetMapping("/today")
    public ApiResponse<HistoryTodayResponse> getToday(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(historyService.getToday(userDetails.getUserId()));
    }

    @Operation(summary = "점수 변화 추이 조회", description = "최근 측정일 최대 4일의 세션 ID와 점수를 시간순으로 반환합니다. 하루에 여러 번 측정한 경우 그날 최신 세션 1건만 집계합니다.")
    @GetMapping("/graph")
    public ApiResponse<List<HistoryScoreTrendItem>> getScoreTrend(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(historyService.getScoreTrend(userDetails.getUserId()));
    }

    @Operation(summary = "지난 측정 기록 조회", description = "최근 측정일 최대 4일의 세션 ID, 날짜, 시간, 점수, 위험도를 반환합니다. 하루에 여러 번 측정한 경우 그날 최신 세션 1건만 반환합니다.")
    @GetMapping("/compare")
    public ApiResponse<List<HistoryRecordItem>> getRecords(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(historyService.getRecords(userDetails.getUserId()));
    }

    @Operation(summary = "기록 이력 전체 목록 조회", description = "측정일 단위 전체 기록 리스트를 반환합니다. 하루에 여러 번 측정한 경우 그날 최신 세션 1건만 포함하며, 기간(1/3/6개월)·점수 구간 필터와 15건 단위 페이지네이션(측정일 기준 개수)을 적용합니다. 각 항목에 세션 ID를 포함합니다.")
    @GetMapping("/list")
    public ApiResponse<HistoryListResponse> getList(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "ALL") HistoryPeriodFilter period,
            @RequestParam(defaultValue = "ALL") HistoryScoreFilter scoreFilter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        return ApiResponse.success(historyService.getList(userDetails.getUserId(), period, scoreFilter, page, size));
    }

    @Operation(
            summary = "구역 점수 변화 추이",
            description = "특정 구역(viewType)의 점수를 측정일 단위로 최근 limit 건(기본 4, 최대 30) 시간순으로 반환합니다. "
                    + "그 구역을 촬영하지 않았거나 무효인 세션은 제외하고, 같은 날 여러 번 측정한 경우 그 구역이 유효한 최신 세션 1건만 포함합니다. "
                    + "zoneScore 는 치석·치태 합성 점수이고 calculusZoneScore/plaqueZoneScore 는 광원별 점수입니다."
    )
    @GetMapping("/zones/{viewType}/trend")
    public ApiResponse<List<ZoneScoreTrendItem>> getZoneTrend(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable ViewType viewType,
            @RequestParam(defaultValue = "4") int limit
    ) {
        return ApiResponse.success(historyService.getZoneTrend(userDetails.getUserId(), viewType, limit));
    }

    @Operation(
            summary = "치아 면적비 변화 추이",
            description = "치아 1개(FDI)의 병변 면적비를 측정일 단위로 최근 limit 건(기본 4, 최대 30) 시간순으로 반환합니다. "
                    + "surface 는 촬영 구역(INNER=설측 10구역, OUTER=외측 3구역), lesionType 은 촬영 광원(CALCULUS=백색광, PLAQUE=UV)으로 고릅니다. "
                    + "같은 표면의 두 구역에 걸쳐 찍힌 치아는 면적비가 큰 쪽을 사용합니다."
    )
    @GetMapping("/teeth/{toothNumber}/trend")
    public ApiResponse<List<ToothTrendItem>> getToothTrend(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable int toothNumber,
            @RequestParam(defaultValue = "INNER") SurfaceType surface,
            @RequestParam(defaultValue = "CALCULUS") LesionType lesionType,
            @RequestParam(defaultValue = "4") int limit
    ) {
        return ApiResponse.success(
                historyService.getToothTrend(userDetails.getUserId(), toothNumber, surface, lesionType, limit));
    }
}
