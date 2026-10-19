package com.habitooth.backend.domain.report.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.ai.service.ToothLocalCoordinateMapper;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.report.converter.ReportConverter;
import com.habitooth.backend.domain.report.dto.response.SessionZoneReportResponse;
import com.habitooth.backend.domain.report.dto.response.SingleImageReportResponse;
import com.habitooth.backend.domain.scan.dto.response.SessionReportResponse;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final AnalysisResultRepository analysisResultRepository;
    private final ScanSessionRepository scanSessionRepository;
    private final ScanImageService scanImageService;
    private final ScanImageRepository scanImageRepository;

    @Transactional(readOnly = true)
    public SingleImageReportResponse getLatestSingleImageReport(Long userId, Long scanImageId) {
        // 소유권 검증(요청 유저의 이미지가 맞는지) 후 진행
        scanImageService.getScanImage(userId, scanImageId);

        AnalysisResult analysisResult = analysisResultRepository
                .findTopByScanImageIdOrderByCreatedAtDesc(scanImageId)
                .orElseThrow(() -> new AiAnalysisHandler(ErrorCode.ANALYSIS_RESULT_NOT_FOUND));

        return ReportConverter.toSingleImageReportResponse(analysisResult);
    }

    @Transactional(readOnly = true)
    public SessionReportResponse getSessionSimpleReport(Long userId, Long sessionId) {
        ScanSession session = findOwnedSession(userId, sessionId);

        List<AnalysisResult> results =
                analysisResultRepository.findLatestSuccessBySessionId(session.getId());

        if (results.isEmpty()) {
            throw new AiAnalysisHandler(ErrorCode.ANALYSIS_RESULT_NOT_FOUND);
        }

        List<SessionReportResponse.ToothStatusData> toothStatusDataList = new ArrayList<>();
        for (AnalysisResult result : results) {
            for (AnalysisToothArea area : result.getToothAreas()) {
                // 정상 치아에도 lesionType 이 채워져 오므로 실제 병변(areaRatio>0)만 노출한다.
                if (area.getToothNumber() == null
                        || area.getAreaRatio() == null || area.getAreaRatio() <= 0.0) {
                    continue;
                }
                toothStatusDataList.add(SessionReportResponse.ToothStatusData.builder()
                        .toothNumber(area.getToothNumber())
                        .lesionType(area.getLesionType().name())
                        .areaRatio(area.getAreaRatio() != null ? area.getAreaRatio().floatValue() : 0.0f)
                        .riskLevel(area.getRiskLevel() != null ? area.getRiskLevel().name() : null)
                        .build());
            }
        }

        // 종합 점수 = 구역 단순 평균 (POST /analyze 의 sessionScore 와 동일 산식). 유효 구역 없으면 0.
        int totalScore = ScoreCalculator.sessionScoreOrZero(results);

        return SessionReportResponse.builder()
                .sessionId(sessionId)
                .totalScore(totalScore)
                .summary(SessionReportResponse.ReportSummary.builder()
                        .totalPlaqueRatio(avgRatio(results, LesionType.PLAQUE))
                        .totalCalculusRatio(avgRatio(results, LesionType.CALCULUS))
                        .build())
                .toothStatuses(toothStatusDataList)
                .build();
    }

    /**
     * 세션 리포트 첫 화면용: 종합 점수 + 13구역 그리드 + 치아 수 요약.
     *
     * <p>분석 결과가 하나도 없어도 예외를 던지지 않는다. 촬영 현황(captured/lightTypes/이미지 ID)만으로도
     * 그리드를 그릴 수 있고, 점수는 전부 null 로 내려가므로 프론트가 "분석 전" 상태를 구분할 수 있다.
     */
    @Transactional(readOnly = true)
    public SessionZoneReportResponse getSessionZoneReport(Long userId, Long sessionId) {
        ScanSession session = findOwnedSession(userId, sessionId);

        List<ScanImage> images = scanImageRepository.findAllByScanSessionId(sessionId);
        List<AnalysisResult> results = analysisResultRepository.findLatestSuccessBySessionId(sessionId);

        Map<ViewType, Map<LesionType, Double>> scoresByLesion = ScoreCalculator.zoneScoresByLesion(results);
        Map<ViewType, Double> combinedScores = ScoreCalculator.combineZoneScores(scoresByLesion);

        // 구역별 치아 수(검출/기대/커버리지)의 출처 결과. 백색광 결과를 우선하고, 백색광이 없을 때만 UV 를 쓴다.
        Map<ViewType, AnalysisResult> countSourceByZone = new EnumMap<>(ViewType.class);
        for (AnalysisResult result : results) {
            if (result.getDetectedToothCount() == null || result.getViewType() == null) {
                continue;
            }
            boolean white = ScoreCalculator.measuredLesionType(result) == LesionType.CALCULUS;
            countSourceByZone.merge(result.getViewType(), result, (current, candidate) -> white ? candidate : current);
        }

        Map<ViewType, List<ScanImage>> imagesByZone = images.stream()
                .collect(Collectors.groupingBy(ScanImage::getViewType));

        List<SessionZoneReportResponse.ZoneReport> zones = new ArrayList<>();
        for (ViewType viewType : ViewType.values()) {
            List<ScanImage> zoneImages = imagesByZone.getOrDefault(viewType, List.of());
            Map<LesionType, Double> byLesion = scoresByLesion.getOrDefault(viewType, Map.of());
            Double zoneScore = combinedScores.get(viewType);
            AnalysisResult countSource = countSourceByZone.get(viewType);

            zones.add(SessionZoneReportResponse.ZoneReport.builder()
                    .viewType(viewType)
                    .surfaceType(ToothLocalCoordinateMapper.surfaceTypeOf(viewType))
                    .captured(!zoneImages.isEmpty())
                    .lightTypes(zoneImages.stream().map(ScanImage::getLightType).distinct().toList())
                    .whiteScanImageId(imageIdOf(zoneImages, LightType.WHITE_LIGHT))
                    .uvScanImageId(imageIdOf(zoneImages, LightType.UV_LIGHT))
                    .zoneScore(ScoreCalculator.roundScore(zoneScore))
                    .zoneValid(zoneScore != null)
                    .calculusZoneScore(ScoreCalculator.roundScore(byLesion.get(LesionType.CALCULUS)))
                    .plaqueZoneScore(ScoreCalculator.roundScore(byLesion.get(LesionType.PLAQUE)))
                    .detectedToothCount(countSource == null ? null : countSource.getDetectedToothCount())
                    .expectedToothCount(countSource == null ? null : countSource.getExpectedToothCount())
                    .coverageRatio(countSource == null ? null : countSource.getCoverageRatio())
                    .build());
        }

        // 세션 단위 "확인한 치아 n / m": 구역별 검출·기대 치아 수의 합. 구버전 결과(기대 치아 수 없음)만 있으면 null.
        Integer detectedSum = sumOrNull(countSourceByZone.values(), AnalysisResult::getDetectedToothCount);
        Integer expectedSum = sumOrNull(countSourceByZone.values(), AnalysisResult::getExpectedToothCount);

        return SessionZoneReportResponse.builder()
                .sessionId(sessionId)
                .scannedAt(session.getStartedAt())
                .sessionScore(ScoreCalculator.roundScore(ScoreCalculator.sessionScore(combinedScores)))
                .validZoneCount(combinedScores.size())
                .capturedZoneCount(imagesByZone.size())
                .totalZoneCount(ViewType.values().length)
                .confirmedToothCount(distinctTeeth(results, null).size())
                .detectedToothCount(detectedSum)
                .expectedToothCount(expectedSum)
                .calculusToothCount(distinctTeeth(results, LesionType.CALCULUS).size())
                .plaqueToothCount(distinctTeeth(results, LesionType.PLAQUE).size())
                .zones(zones)
                .build();
    }

    /** 값이 있는 결과만 더한다. 하나도 없으면 null (구버전 FastAPI 결과만 있는 세션). */
    private static Integer sumOrNull(Collection<AnalysisResult> results, Function<AnalysisResult, Integer> getter) {
        int sum = 0;
        boolean any = false;
        for (AnalysisResult result : results) {
            Integer value = getter.apply(result);
            if (value != null) {
                sum += value;
                any = true;
            }
        }
        return any ? sum : null;
    }

    /** 세션 존재 여부 + 소유권 확인. 남의 세션은 403(FORBIDDEN). */
    private ScanSession findOwnedSession(Long userId, Long sessionId) {
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));
        if (!session.getUserId().equals(userId)) {
            throw new AiAnalysisHandler(ErrorCode.FORBIDDEN);
        }
        return session;
    }

    private static Long imageIdOf(List<ScanImage> images, LightType lightType) {
        return images.stream()
                .filter(image -> image.getLightType() == lightType)
                .map(ScanImage::getId)
                .findFirst()
                .orElse(null);
    }

    /**
     * 검출(DETECTED)된 FDI 확정 치아의 집합. {@code lesionType} 이 null 이면 검출된 치아 전부, 아니면 그 병변이
     * 실제로 있는(areaRatio > 0) 치아만. 여러 구역에 걸친 같은 치아는 한 번만 센다.
     * 2.3 부터 저장되는 미검출(NOT_DETECTED/SKIPPED) 행은 "확인한 치아"가 아니므로 뺀다.
     */
    private static Set<Integer> distinctTeeth(List<AnalysisResult> results, LesionType lesionType) {
        Set<Integer> teeth = new HashSet<>();
        for (AnalysisResult result : results) {
            for (AnalysisToothArea area : result.getToothAreas()) {
                if (area.getToothNumber() == null || !area.isDetected()) {
                    continue;
                }
                if (lesionType != null) {
                    boolean hasLesion = area.getLesionType() == lesionType
                            && area.getAreaRatio() != null && area.getAreaRatio() > 0.0;
                    if (!hasLesion) {
                        continue;
                    }
                }
                teeth.add(area.getToothNumber());
            }
        }
        return teeth;
    }

    /**
     * FastAPI report.summary 를 그대로 영속화한 {@code AnalysisResult.totalXxxRatio} 의
     * 구역 평균(값이 있는 구역만). 병변 타입별로 필드가 나뉘어 있어 분기한다.
     */
    private float avgRatio(List<AnalysisResult> results, LesionType lesionType) {
        double avg = results.stream()
                .map(r -> lesionType == LesionType.PLAQUE
                        ? r.getTotalPlaqueRatio()
                        : r.getTotalCalculusRatio())
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        return Math.round(avg * 10) / 10.0f;
    }
}
