package com.habitooth.backend.domain.history.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisToothAreaRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.ai.service.ToothLocalCoordinateMapper;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.history.dto.HistoryPeriodFilter;
import com.habitooth.backend.domain.history.dto.HistoryScoreFilter;
import com.habitooth.backend.domain.history.dto.response.HistoryListItem;
import com.habitooth.backend.domain.history.dto.response.HistoryListResponse;
import com.habitooth.backend.domain.history.dto.response.HistoryRecordItem;
import com.habitooth.backend.domain.history.dto.response.HistoryScoreTrendItem;
import com.habitooth.backend.domain.history.dto.response.HistoryTodayResponse;
import com.habitooth.backend.domain.history.dto.response.ToothTrendItem;
import com.habitooth.backend.domain.history.dto.response.ZoneScoreTrendItem;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HistoryService {

    /** 추이 API 1회 응답의 최대 점 수. UI 는 4점을 쓰지만 기간 그래프용으로 여유를 둔다. */
    private static final int MAX_TREND_POINTS = 30;

    private final ScanSessionRepository scanSessionRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisToothAreaRepository analysisToothAreaRepository;

    public HistoryTodayResponse getToday(Long userId) {
        // 측정일 단위. 같은 날 여러 번 측정해도 그날 최신 세션 1건만, scoreDiff 는 직전 "측정일" 과 비교.
        List<ScanSession> recentDays = latestSessionPerDate(allCompletedSessionsDesc(userId));

        if (recentDays.isEmpty()) {
            return null;
        }

        ScanSession current = recentDays.get(0);
        List<AnalysisResult> currentResults = getAnalysisResults(current.getId());
        int currentScore = calcAvgScore(currentResults);
        RiskLevel riskLevel = calcMaxRiskLevel(currentResults);

        Integer scoreDiff = null;
        if (recentDays.size() >= 2) {
            int previousScore = calcAvgScore(getAnalysisResults(recentDays.get(1).getId()));
            scoreDiff = currentScore - previousScore;
        }

        return HistoryTodayResponse.builder()
                .sessionId(current.getId())
                .date(current.getStartedAt().toLocalDate())
                .time(current.getStartedAt().toLocalTime())
                .score(currentScore)
                .riskLevel(riskLevel)
                .scoreDiff(scoreDiff)
                .build();
    }

    public List<HistoryScoreTrendItem> getScoreTrend(Long userId) {
        // 측정일 단위 최근 4일 (같은 날 다중 측정은 그날 최신 세션 1건).
        List<ScanSession> recent4 = latestSessionPerDate(allCompletedSessionsDesc(userId)).stream()
                .limit(4)
                .toList();

        List<HistoryScoreTrendItem> items = new ArrayList<>();
        for (ScanSession session : recent4) {
            int score = calcAvgScore(getAnalysisResults(session.getId()));
            items.add(HistoryScoreTrendItem.builder()
                    .sessionId(session.getId())
                    .date(session.getStartedAt().toLocalDate())
                    .score(score)
                    .build());
        }

        // 최신순 → 시간순 역정렬
        Collections.reverse(items);
        return items;
    }

    public List<HistoryRecordItem> getRecords(Long userId) {
        // 측정일 단위 최근 4일 (같은 날 다중 측정은 그날 최신 세션 1건).
        List<ScanSession> recent4 = latestSessionPerDate(allCompletedSessionsDesc(userId)).stream()
                .limit(4)
                .toList();

        List<HistoryRecordItem> items = new ArrayList<>();
        for (ScanSession session : recent4) {
            List<AnalysisResult> results = getAnalysisResults(session.getId());
            items.add(HistoryRecordItem.builder()
                    .sessionId(session.getId())
                    .date(session.getStartedAt().toLocalDate())
                    .time(session.getStartedAt().toLocalTime())
                    .score(calcAvgScore(results))
                    .riskLevel(calcMaxRiskLevel(results))
                    .build());
        }

        return items;
    }

    public HistoryListResponse getList(Long userId, HistoryPeriodFilter period, HistoryScoreFilter scoreFilter, int page, int size) {
        LocalDateTime since = period.toSince(LocalDateTime.now());
        // 측정일 단위. 같은 날 여러 번 측정해도 그날 최신 세션 1건만 목록/페이지네이션 대상.
        List<ScanSession> sessions = latestSessionPerDate(scanSessionRepository
                .findAllByUserIdAndStatusAndPeriod(userId, ScanSessionStatus.COMPLETED, since));

        List<HistoryListItem> filtered = new ArrayList<>();
        for (ScanSession session : sessions) {
            List<AnalysisResult> results = getAnalysisResults(session.getId());
            int score = calcAvgScore(results);
            if (!scoreFilter.matches(score)) continue;

            filtered.add(HistoryListItem.builder()
                    .sessionId(session.getId())
                    .date(session.getStartedAt().toLocalDate())
                    .score(score)
                    .plaqueRiskLevel(calcRiskLevel(results, LesionType.PLAQUE))
                    .calculusRiskLevel(calcRiskLevel(results, LesionType.CALCULUS))
                    .build());
        }

        int totalCount = filtered.size();
        int totalPages = (int) Math.ceil(totalCount / (double) size);
        int fromIndex = Math.min(page * size, totalCount);
        int toIndex = Math.min(fromIndex + size, totalCount);

        return HistoryListResponse.builder()
                .totalCount(totalCount)
                .page(page)
                .size(size)
                .totalPages(totalPages)
                .items(filtered.subList(fromIndex, toIndex))
                .build();
    }

    /**
     * 구역 점수 추이. 사용자의 COMPLETED 세션에서 {@code viewType} 구역의 합성 점수를 측정일 단위로
     * 최근 {@code limit} 개, 시간순(과거 → 현재)으로 돌려준다.
     */
    public List<ZoneScoreTrendItem> getZoneTrend(Long userId, ViewType viewType, int limit) {
        int cappedLimit = capLimit(limit);
        List<AnalysisResult> results =
                analysisResultRepository.findLatestSuccessByUserIdAndViewType(userId, viewType);

        // 세션별로 묶는다 (한 구역을 백색광·UV 로 찍으면 행이 2개). 입력이 세션 최신순이라 순서가 유지된다.
        Map<Long, List<AnalysisResult>> bySession = new LinkedHashMap<>();
        for (AnalysisResult result : results) {
            bySession.computeIfAbsent(sessionOf(result).getId(), k -> new ArrayList<>()).add(result);
        }

        List<ZoneScoreTrendItem> items = new ArrayList<>();
        Set<LocalDate> seenDates = new HashSet<>();
        for (List<AnalysisResult> sessionResults : bySession.values()) {
            Map<LesionType, Double> byLesion = ScoreCalculator.zoneScoresByLesion(sessionResults)
                    .getOrDefault(viewType, Map.of());
            Double zoneScore = ScoreCalculator.combineZoneScore(
                    byLesion.get(LesionType.CALCULUS), byLesion.get(LesionType.PLAQUE));
            if (zoneScore == null) {
                continue;
            }

            ScanSession session = sessionOf(sessionResults.get(0));
            LocalDate date = session.getStartedAt().toLocalDate();
            if (!seenDates.add(date)) {
                continue;
            }

            items.add(ZoneScoreTrendItem.builder()
                    .sessionId(session.getId())
                    .date(date)
                    .zoneScore(ScoreCalculator.roundScore(zoneScore))
                    .calculusZoneScore(ScoreCalculator.roundScore(byLesion.get(LesionType.CALCULUS)))
                    .plaqueZoneScore(ScoreCalculator.roundScore(byLesion.get(LesionType.PLAQUE)))
                    .build());
            if (items.size() >= cappedLimit) {
                break;
            }
        }

        Collections.reverse(items);
        return items;
    }

    /**
     * 치아 1개의 면적비 추이. 표면({@code surface})은 촬영 구역으로, 병변({@code lesionType})은
     * 촬영 광원으로 고른다(치석=백색광, 치태=UV). 같은 표면의 두 구역에 걸쳐 찍힌 치아는
     * 면적비가 큰 쪽을 쓴다(세션 리포트의 치아 병합 규칙과 동일).
     */
    public List<ToothTrendItem> getToothTrend(Long userId, int toothNumber, SurfaceType surface,
                                              LesionType lesionType, int limit) {
        int cappedLimit = capLimit(limit);
        LightType lightType = lesionType == LesionType.PLAQUE ? LightType.UV_LIGHT : LightType.WHITE_LIGHT;
        List<AnalysisToothArea> areas = analysisToothAreaRepository.findLatestSuccessByUserIdAndTooth(
                userId, toothNumber, ToothLocalCoordinateMapper.zonesOf(surface), lightType);

        Map<Long, AnalysisToothArea> worstBySession = new LinkedHashMap<>();
        for (AnalysisToothArea area : areas) {
            worstBySession.merge(sessionOf(area.getAnalysisResult()).getId(), area,
                    (current, candidate) -> areaRatioOf(candidate) > areaRatioOf(current) ? candidate : current);
        }

        List<ToothTrendItem> items = new ArrayList<>();
        Set<LocalDate> seenDates = new HashSet<>();
        for (AnalysisToothArea area : worstBySession.values()) {
            ScanSession session = sessionOf(area.getAnalysisResult());
            LocalDate date = session.getStartedAt().toLocalDate();
            if (!seenDates.add(date)) {
                continue;
            }

            items.add(ToothTrendItem.builder()
                    .sessionId(session.getId())
                    .date(date)
                    .viewType(area.getAnalysisResult().getViewType())
                    .areaRatio(areaRatioOf(area))
                    .toothScore(ScoreCalculator.roundScore(area.getToothScore() != null
                            ? area.getToothScore()
                            : ScoreCalculator.toothScore(area.getAreaRatio())))
                    .riskLevel(area.getRiskLevel())
                    .build());
            if (items.size() >= cappedLimit) {
                break;
            }
        }

        Collections.reverse(items);
        return items;
    }

    private static int capLimit(int limit) {
        return Math.max(1, Math.min(limit, MAX_TREND_POINTS));
    }

    private static double areaRatioOf(AnalysisToothArea area) {
        return area.getAreaRatio() != null ? area.getAreaRatio() : 0.0;
    }

    private static ScanSession sessionOf(AnalysisResult result) {
        return result.getScanImage().getScanSession();
    }

    private List<ScanSession> allCompletedSessionsDesc(Long userId) {
        // since=null → 전체 기간, startedAt DESC 정렬.
        return scanSessionRepository
                .findAllByUserIdAndStatusAndPeriod(userId, ScanSessionStatus.COMPLETED, null);
    }

    /**
     * 같은 날짜에 여러 번 측정한 경우 그날 최신 세션 1건만 남긴다.
     * 입력은 startedAt DESC 정렬 가정 — 날짜별 첫 등장(=최신)만 유지하고 반환도 최신 날짜순.
     */
    private List<ScanSession> latestSessionPerDate(List<ScanSession> sessionsDesc) {
        Map<LocalDate, ScanSession> byDate = new LinkedHashMap<>();
        for (ScanSession session : sessionsDesc) {
            byDate.putIfAbsent(session.getStartedAt().toLocalDate(), session);
        }
        return new ArrayList<>(byDate.values());
    }

    private List<AnalysisResult> getAnalysisResults(Long sessionId) {
        // 구역별 최신 SUCCESS 1건씩. 재분석 누적/실패 행 제외.
        return analysisResultRepository.findLatestSuccessBySessionId(sessionId);
    }

    private int calcAvgScore(List<AnalysisResult> results) {
        // 구역 단순 평균 — POST /analyze, 리포트, 대시보드와 같은 산식. 무효 구역(zoneScore=null) 제외.
        return ScoreCalculator.sessionScoreOrZero(results);
    }

    private RiskLevel calcMaxRiskLevel(List<AnalysisResult> results) {
        return results.stream()
                .flatMap(r -> r.getToothAreas().stream())
                .map(AnalysisToothArea::getRiskLevel)
                .filter(riskLevel -> riskLevel != null)
                .max((a, b) -> Integer.compare(a.ordinal(), b.ordinal()))
                .orElse(RiskLevel.VERY_LOW);
    }

    private RiskLevel calcRiskLevel(
            List<AnalysisResult> results,
            LesionType lesionType
    ) {
        return results.stream()
                .flatMap(r -> r.getToothAreas().stream())
                .filter(area -> area.getLesionType() == lesionType)
                .map(AnalysisToothArea::getRiskLevel)
                .filter(riskLevel -> riskLevel != null)
                .max((a, b) -> Integer.compare(a.ordinal(), b.ordinal()))
                .orElse(RiskLevel.VERY_LOW);
    }
}
