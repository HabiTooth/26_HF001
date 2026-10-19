package com.habitooth.backend.domain.report.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.JawType;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.ai.service.ToothLocalCoordinateMapper;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.report.dto.response.ReportDetectedIssueResponse;
import com.habitooth.backend.domain.report.dto.response.ReportPolygonPoint;
import com.habitooth.backend.domain.report.dto.response.ReportToothAreaResponse;
import com.habitooth.backend.domain.report.dto.response.SingleImageReportResponse;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUrls;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
@Slf4j
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ReportConverter {
 
    private static final ObjectMapper objectMapper = new ObjectMapper();
 
    public static SingleImageReportResponse toSingleImageReportResponse(
            AnalysisResult analysisResult
    ) {
        return SingleImageReportResponse.builder()
                .analysisResultId(analysisResult.getId())
                .scanImageId(getScanImageId(analysisResult))
                .taskId(analysisResult.getAiTaskId())
                .analysisStatus(analysisResult.getAnalysisStatus())
                .viewType(analysisResult.getViewType())
                // @Deprecated totalScore(v1, 신규 쓰기 없음) 대신 zoneScore 를 정수로 반올림해 노출한다.
                .totalScore(ScoreCalculator.roundScore(analysisResult.getZoneScore()))
                .recommendation(analysisResult.getRecommendation())
                .teeth(toToothAreaResponses(analysisResult.getToothAreas()))
                .issues(toDetectedIssueResponses(analysisResult.getDetectedIssues()))
                .createdAt(analysisResult.getCreatedAt())
                .imageFileUrl(ScanImageUrls.fileUrl(getScanImageId(analysisResult)))
                .overlayFileUrl(analysisResult.getScanImage().getOverlayImageUrl() != null
                        ? ScanImageUrls.overlayUrl(getScanImageId(analysisResult))
                        : null)
                .build();
    }
 
    private static Long getScanImageId(AnalysisResult analysisResult) {
        return analysisResult.getScanImage().getId();
    }
 
    private static List<ReportToothAreaResponse> toToothAreaResponses(
            List<AnalysisToothArea> toothAreas
    ) {
        return toothAreas.stream()
                .map(ReportConverter::toToothAreaResponse)
                .toList();
    }
 
    private static ReportToothAreaResponse toToothAreaResponse(
            AnalysisToothArea toothArea
    ) {
        ViewType viewType = toothArea.getAnalysisResult() != null
                ? toothArea.getAnalysisResult().getViewType()
                : null;
 
        return ReportToothAreaResponse.builder()
                .areaId(toothArea.getAreaId())
                .toothNumber(toothArea.getToothNumber())
                .status(toothArea.getStatus() != null ? toothArea.getStatus() : ToothDetectionStatus.DETECTED)
                .templateRegionId(toothArea.getTemplateRegionId())
                .jawType(deriveJawType(toothArea.getToothNumber()))
                .surfaceType(deriveSurfaceType(viewType))
                .viewType(viewType)
                .lesionType(toothArea.getLesionType())
                .areaRatio(toothArea.getAreaRatio())
                .toothScore(ScoreCalculator.roundScore(toothArea.getToothScore()))
                .riskLevel(toothArea.getRiskLevel())
                .build();
    }
 
    /**
     * FDI 번호의 사분면(십의 자리)으로 턱을 판정한다.
     * 1,2사분면(11~28) = 상악, 3,4사분면(31~48) = 하악.
     */
    private static JawType deriveJawType(Integer toothNumber) {
        if (toothNumber == null) {
            return null;
        }
        int quadrant = toothNumber / 10;
        if (quadrant == 1 || quadrant == 2) {
            return JawType.UPPER;
        }
        if (quadrant == 3 || quadrant == 4) {
            return JawType.LOWER;
        }
        return null;
    }
 
    private static SurfaceType deriveSurfaceType(ViewType viewType) {
        if (viewType == null) {
            return null;
        }
        // 3D 좌표 응답(/3d)과 같은 판정을 쓴다.
        return ToothLocalCoordinateMapper.surfaceTypeOf(viewType);
    }
 
    private static List<ReportDetectedIssueResponse> toDetectedIssueResponses(
            List<AnalysisDetectedIssue> detectedIssues
    ) {
        return detectedIssues.stream()
                .map(ReportConverter::toDetectedIssueResponse)
                .toList();
    }
 
    private static ReportDetectedIssueResponse toDetectedIssueResponse(
            AnalysisDetectedIssue detectedIssue
    ) {
        return ReportDetectedIssueResponse.builder()
                .toothNumber(detectedIssue.getToothNumber())
                .templateRegionId(detectedIssue.getTemplateRegionId())
                .lesionType(detectedIssue.getLesionType())
                .confidence(detectedIssue.getConfidence())
                .polygon(toPolygonPoints(detectedIssue.getPolygonJson()))
                .build();
    }
 
    private static List<ReportPolygonPoint> toPolygonPoints(String polygonJson) {
        try {
            return objectMapper.readValue(
                    polygonJson,
                    new TypeReference<List<ReportPolygonPoint>>() {}
            );
        } catch (JsonProcessingException e) {
            log.error("polygonJson 파싱 실패. polygonJson={}", polygonJson, e);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }
}