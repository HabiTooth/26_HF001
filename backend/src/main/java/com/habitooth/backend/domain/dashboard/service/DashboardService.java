package com.habitooth.backend.domain.dashboard.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.dashboard.dto.response.DashboardReportResponse;
import com.habitooth.backend.domain.dashboard.dto.response.DashboardRiskResponse;
import com.habitooth.backend.domain.dashboard.dto.response.DashboardScoreResponse;
import com.habitooth.backend.domain.dashboard.dto.response.RiskCategorySummary;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ScanSessionRepository scanSessionRepository;
    private final AnalysisResultRepository analysisResultRepository;

    public DashboardScoreResponse getScore(Long userId) {
        List<ScanSession> recentTwo = scanSessionRepository
                .findTop2ByUserIdAndStatusAndDeletedAtIsNullOrderByStartedAtDesc(userId, ScanSessionStatus.COMPLETED);

        if (recentTwo.isEmpty()) {
            return DashboardScoreResponse.builder().build();
        }

        ScanSession current = recentTwo.get(0);
        int currentScore = calcAvgScore(getAnalysisResults(current.getId()));

        Integer scoreDiff = null;
        if (recentTwo.size() == 2) {
            int previousScore = calcAvgScore(getAnalysisResults(recentTwo.get(1).getId()));
            scoreDiff = currentScore - previousScore;
        }

        return DashboardScoreResponse.builder()
                .sessionId(current.getId())
                .score(currentScore)
                .scoreDiff(scoreDiff)
                .scannedAt(current.getStartedAt())
                .build();
    }

    public DashboardReportResponse getReport(Long userId) {
        Optional<ScanSession> sessionOpt = scanSessionRepository
                .findFirstByUserIdAndStatusAndDeletedAtIsNullOrderByStartedAtDesc(userId, ScanSessionStatus.COMPLETED);

        if (sessionOpt.isEmpty()) {
            return DashboardReportResponse.builder().build();
        }

        ScanSession session = sessionOpt.get();
        List<AnalysisResult> results = getAnalysisResults(session.getId());

        return DashboardReportResponse.builder()
                .sessionId(session.getId())
                .scannedAt(session.getStartedAt())
                .averageScore(calcAvgScore(results))
                .plaqueRiskLevel(calcMaxRiskByLesion(results, LesionType.PLAQUE))
                .calculusRiskLevel(calcMaxRiskByLesion(results, LesionType.CALCULUS))
                .build();
    }

    public DashboardRiskResponse getRisk(Long userId) {
        Optional<ScanSession> sessionOpt = scanSessionRepository
                .findFirstByUserIdAndStatusAndDeletedAtIsNullOrderByStartedAtDesc(
                        userId,
                        ScanSessionStatus.COMPLETED
                );

        if (sessionOpt.isEmpty()) {
                return DashboardRiskResponse.builder()
                        .categories(List.of())
                        .build();
        }

        ScanSession session = sessionOpt.get();
        List<AnalysisResult> results = getAnalysisResults(session.getId());

        // 미검출(NOT_DETECTED/SKIPPED) 행은 분모에서 뺀다 — 넣으면 영향 비율이 실제보다 작아 보인다.
        Set<Integer> totalTeeth = results.stream()
                .flatMap(r -> r.getToothAreas().stream())
                .filter(AnalysisToothArea::isDetected)
                .map(area -> area.getToothNumber())
                .filter(n -> n != null)
                .collect(Collectors.toSet());

        int totalCount = totalTeeth.isEmpty() ? 1 : totalTeeth.size();

        List<RiskCategorySummary> categories = new ArrayList<>();

        for (LesionType lesionType : LesionType.values()) {

                List<AnalysisToothArea> toothAreas = results.stream()
                        .flatMap(r -> r.getToothAreas().stream())
                        .filter(AnalysisToothArea::isDetected)
                        .filter(area -> area.getLesionType() == lesionType)
                        .toList();

                if (toothAreas.isEmpty()) {
                continue;
                }

                Set<Integer> affectedTeeth = toothAreas.stream()
                        .map(AnalysisToothArea::getToothNumber)
                        .filter(n -> n != null)
                        .collect(Collectors.toSet());

                int affectedRatio = (int) Math.round(
                        affectedTeeth.size() * 100.0 / totalCount
                );

                RiskLevel maxRisk = toothAreas.stream()
                        .map(AnalysisToothArea::getRiskLevel)
                        .filter(risk -> risk != null)
                        .max((a, b) -> Integer.compare(a.ordinal(), b.ordinal()))
                        .orElse(RiskLevel.VERY_LOW);

                categories.add(
                        RiskCategorySummary.builder()
                                .lesionType(lesionType)
                                .riskLevel(maxRisk)
                                .affectedRatio(affectedRatio)
                                .build()
                );
        }

        return DashboardRiskResponse.builder()
                .sessionId(session.getId())
                .categories(categories)
                .build();
        }

        private List<AnalysisResult> getAnalysisResults(Long sessionId) {
                // 구역별 최신 SUCCESS 1건씩. 재분석 누적/실패 행 제외.
                return analysisResultRepository.findLatestSuccessBySessionId(sessionId);
        }

        private int calcAvgScore(List<AnalysisResult> results) {
                // 구역 단순 평균 — POST /analyze, 리포트, 히스토리와 같은 산식.
                return ScoreCalculator.sessionScoreOrZero(results);
        }

        private RiskLevel calcMaxRiskByLesion(
                List<AnalysisResult> results,
                LesionType lesionType
        ) {
                return results.stream()
                        .flatMap(r -> r.getToothAreas().stream())
                        .filter(area -> area.getLesionType() == lesionType)
                        .map(AnalysisToothArea::getRiskLevel)
                        .filter(risk -> risk != null)
                        .max((a, b) -> Integer.compare(a.ordinal(), b.ordinal()))
                        .orElse(RiskLevel.VERY_LOW);
        }
}
