package com.habitooth.backend.domain.ai.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.dto.response.AiAnalyzeResponse;
import com.habitooth.backend.domain.ai.dto.response.CalculusCrossCheckResult;
import com.habitooth.backend.domain.ai.dto.response.DetectedIssueResult;
import com.habitooth.backend.domain.ai.dto.response.PolygonPoint;
import com.habitooth.backend.domain.ai.dto.response.ToothStatusResult;
import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class AiAnalysisConverter {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static AnalysisResult toAnalysisResult(
            ScanImage scanImage,
            AiAnalyzeResponse response
    ) {
        // 백색광: FastAPI(report.zoneScore) 값이 정본. UV: FastAPI 가 구역 점수를 주지 않으므로
        // 형광 치태 비율로 Spring 이 계산한다(치석·치태 합성은 조회 시 combineZoneScores).
        boolean fastApiScored = isFastApiScored(scanImage, response);
        Double zoneScore = fastApiScored
                ? response.getZoneScore()
                : ScoreCalculator.zoneScore(response.getToothStatuses());
        boolean zoneValid = fastApiScored
                ? Boolean.TRUE.equals(response.getZoneValid()) && zoneScore != null
                : zoneScore != null;
 
        AnalysisResult analysisResult = AnalysisResult.builder()
                .scanImage(scanImage)
                .analysisStatus(AnalysisStatus.SUCCESS)
                .viewType(response.getViewType())
                .aiTaskId(response.getTaskId())
                .zoneScore(zoneScore)
                .zoneValid(zoneValid)
                .detectedToothCount(response.getDetectedToothCount())
                .expectedToothCount(response.getExpectedToothCount())
                .coverageRatio(response.getCoverageRatio())
                .scoreVersion(fastApiScored ? response.getScoreVersion() : ScoreCalculator.SCORE_VERSION)
                .totalCalculusRatio(response.getTotalCalculusRatio())
                .totalPlaqueRatio(response.getTotalPlaqueRatio())
                .calculusCrossCheckJson(toCalculusCrossCheckJson(response.getCalculusCrossCheck()))
                .recommendation(response.getRecommendation())
                .build();
 
        // 🆕 teeth(원본 폴리곤) 가 아니라 toothStatuses(위험도 포함) 기준으로 저장.
        if (response.getToothStatuses() != null) {
            response.getToothStatuses().stream()
                    .map(AiAnalysisConverter::toAnalysisToothArea)
                    .forEach(analysisResult::addToothArea);
        }
 
        if (response.getIssues() != null) {
            response.getIssues().stream()
                    .map(AiAnalysisConverter::toAnalysisDetectedIssue)
                    .forEach(analysisResult::addDetectedIssue);
        }
 
        return analysisResult;
    }

    /**
     * FastAPI 가 구역 점수를 계산한 응답이면 그 값을 정본으로 쓴다. 클라이언트가 scoreVersion 을
     * 채워 보낸 경우가 그것이다 — 백색광은 항상, UV 는 2.3(fluorescenceZoneScore) 부터.
     * scoreVersion 이 비어 있으면 Spring(ScoreCalculator)이 계산한다.
     */
    public static boolean isFastApiScored(ScanImage scanImage, AiAnalyzeResponse response) {
        return response.getScoreVersion() != null;
    }

    /**
     * 치아 점수: FastAPI 가 준 값 우선, 없으면(구버전 UV 형광 치태) Spring 산식.
     * 미검출(NOT_DETECTED/SKIPPED) 치아는 채점 대상이 아니므로 null.
     */
    public static Double toothScoreOf(ToothStatusResult result) {
        if (!ScoreCalculator.isScorable(result)) {
            return null;
        }
        return result.getToothScore() != null
                ? result.getToothScore()
                : ScoreCalculator.toothScore(result.getAreaRatio());
    }

    public static String toCalculusCrossCheckJson(CalculusCrossCheckResult crossCheck) {
        if (crossCheck == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(crossCheck);
        } catch (JsonProcessingException e) {
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }

    private static AnalysisToothArea toAnalysisToothArea(ToothStatusResult result) {
        return AnalysisToothArea.builder()
                .toothNumber(result.getToothNumber())
                .status(result.getStatus() != null ? result.getStatus() : ToothDetectionStatus.DETECTED)
                .templateRegionId(result.getTemplateRegionId())
                .lesionType(result.getLesionType())
                .areaRatio(result.getAreaRatio())
                .toothScore(toothScoreOf(result))
                .riskLevel(result.getRiskLevel())
                .build();
    }

    private static AnalysisDetectedIssue toAnalysisDetectedIssue(DetectedIssueResult result) {
        return AnalysisDetectedIssue.builder()
                .toothNumber(result.getToothNumber())
                .templateRegionId(result.getTemplateRegionId())
                .lesionType(result.getLesionType())
                .confidence(result.getConfidence())
                // riskLevel 은 치아 단위(toothStatuses)로 이관되어 여기서는 채우지 않는다.
                .polygonJson(toPolygonJson(result.getPolygon()))
                .build();
    }
 
    private static String toPolygonJson(List<PolygonPoint> polygon) {
        try {
            return objectMapper.writeValueAsString(polygon);
        } catch (JsonProcessingException e) {
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }
}