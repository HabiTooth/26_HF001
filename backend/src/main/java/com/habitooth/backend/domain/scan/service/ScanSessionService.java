package com.habitooth.backend.domain.scan.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.dto.response.MeshCoordinateResponse;
import com.habitooth.backend.domain.scan.dto.response.ScanCaptureStatusResponse;
import com.habitooth.backend.domain.scan.dto.ToothSummary;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ScanSessionService {
    private static final int TOTAL_ZONE_COUNT = 13;
    private static final Logger log = LoggerFactory.getLogger(ScanSessionService.class);
    private final ScanSessionRepository scanSessionRepository;
    private final ScanImageRepository scanImageRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserRepository userRepository;

    // 1. 세션 생성
    public Long createSession(Long userId, Long deviceId) {
        // 결손치 프로필 없이 촬영을 시작하면 AI 번호 매핑이 틀어지므로, 13장을 다 찍기 전인
        // 세션 생성 시점에 미리 막는다(사후에 /analyze 에서 막으면 이미 다 찍은 뒤라 비효율적).
        if (!userRepository.existsByIdAndToothProfileSetAtIsNotNull(userId)) {
            throw new ScanHandler(ErrorCode.TOOTH_PROFILE_NOT_SET);
        }

        ScanSession session = ScanSession.create(userId, deviceId);

        ScanSession saved = scanSessionRepository.save(session);

        return saved.getId();
    }

    // 2. 세션 이미지 추가 (이미 업로드된 구조 가정)
    public void addImageToSession(Long sessionId, ScanImage image) {

        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        scanImageRepository.save(image);
    }


    @Transactional(readOnly = true)
    public void validateImageUpload(
            Long userId,
            Long sessionId,
            ViewType viewType,
            LightType lightType
    ) {
        scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(sessionId, userId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        if (scanImageRepository.existsByScanSessionIdAndViewTypeAndLightType(
                sessionId, viewType, lightType
        )) {
            // TODO: ErrorCode.DUPLICATE_SCAN_ZONE 추가 후 ScanHandler로 교체
            throw new IllegalStateException(
                    "이미 촬영된 구역입니다. viewType=" + viewType
                            + ", lightType=" + lightType
            );
        }
    }

    @Transactional(readOnly = true)
    public ScanCaptureStatusResponse getCaptureStatus(Long userId, Long sessionId) {
        scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(sessionId, userId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        List<ScanImage> images = scanImageRepository.findAllByScanSessionId(sessionId);

        List<ScanCaptureStatusResponse.CapturedZone> capturedZones = images.stream()
                .map(image -> ScanCaptureStatusResponse.CapturedZone.builder()
                        .scanImageId(image.getId())
                        .viewType(image.getViewType())
                        .lightType(image.getLightType())
                        .build())
                .toList();

        int capturedZoneCount = (int) images.stream()
                .map(ScanImage::getViewType)
                .distinct()
                .count();

        return ScanCaptureStatusResponse.builder()
                .sessionId(sessionId)
                .uploadedImageCount(images.size())
                .capturedZoneCount(capturedZoneCount)
                .totalZoneCount(TOTAL_ZONE_COUNT)
                .canAnalyze(!images.isEmpty())
                .capturedZones(capturedZones)
                .build();
    }

    // 4. 세션 리포트
    @Transactional(readOnly = true)
    public MeshCoordinateResponse getSessionReport(Long userId, Long sessionId) {
        // 소유권 검증
        scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(sessionId, userId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        List<ScanImage> images = scanImageRepository.findAllByScanSessionId(sessionId);
        if (images.isEmpty()) {
            throw new ScanHandler(ErrorCode.NO_IMAGES_IN_SESSION);
        }

        // 이미지(구역)별 최신 SUCCESS 결과 1건씩만 — 재분석 누적/실패 행을 걸러낸다.
        List<AnalysisResult> results =
                analysisResultRepository.findLatestSuccessBySessionId(sessionId);

        if (results.isEmpty()) {
            throw new ScanHandler(ErrorCode.ANALYSIS_RESULT_NOT_FOUND);
        }

        // averageScore: 구역 단순 평균(ScoreCalculator). 무효 구역(zoneScore=null)은 제외.
        //   POST /analyze 의 sessionScore 와 동일 산식이라 두 API 값이 일치한다.
        //   ⚠️ 한 구역을 백색광(치석)·UV(치태)로 찍으면 결과 행이 2개다. viewType 을 키로
        //      바로 덮어쓰면 한쪽 광원이 통째로 사라지므로 반드시 combineZoneScores 로 합친다.
        int avgScore = ScoreCalculator.sessionScoreOrZero(results);

        // toothSummaries: 치아 상태 정본인 AnalysisToothArea 기준. confidence 는 쓰지 않는다.
        //   FDI 번호별로 병합하며, 여러 구역에 걸친 같은 치아는 areaRatio 최댓값을 취한다.
        Map<Integer, ToothSummary> map = new HashMap<>();
        for (AnalysisResult r : results) {
            for (AnalysisToothArea area : r.getToothAreas()) {
                // 미검출(NOT_DETECTED/SKIPPED) 치아는 areaRatio 가 null 이라 0.0 으로 두면 "깨끗한 치아"로 보인다.
                if (area.getToothNumber() == null || !area.isDetected()) {
                    continue;
                }
                double areaRatio = area.getAreaRatio() != null ? area.getAreaRatio() : 0.0;
                // FastAPI 는 정상 치아에도 lesionType 을 채워 보내므로 areaRatio 로 판단한다.
                boolean hasLesion = areaRatio > 0.0;

                map.merge(
                        area.getToothNumber(),
                        ToothSummary.builder()
                                .toothNumber(area.getToothNumber())
                                .riskScore(areaRatio)
                                .issueCount(hasLesion ? 1 : 0)
                                .build(),
                        (oldV, newV) -> ToothSummary.builder()
                                .toothNumber(oldV.getToothNumber())
                                .riskScore(Math.max(oldV.getRiskScore(), newV.getRiskScore()))
                                .issueCount(oldV.getIssueCount() + newV.getIssueCount())
                                .build()
                );
            }
        }

        return MeshCoordinateResponse.builder()
                .sessionId(sessionId)
                .averageScore(avgScore)
                .toothSummaries(new ArrayList<>(map.values()))
                .build();
    }
}