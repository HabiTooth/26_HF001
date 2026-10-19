package com.habitooth.backend.domain.ai.client;

import com.habitooth.backend.domain.ai.dto.response.*;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import org.springframework.core.io.Resource;

/**
 * FastAPI(main_v12) 분석 파이프라인 클라이언트.
 *
 * <p>호출 순서 계약 (같은 zone 의 백색광/UV 한 쌍):
 * <ol>
 *   <li>{@link #initTask} 로 백색광 task 생성 → {@link #analyzeWhite} (calculus 까지 완료)</li>
 *   <li>{@link #initTask} 로 UV task 생성 → {@link #analyzeUv} 에 백색광 taskId 를
 *       calculusTaskId 로 전달 (FastAPI 가 메모리의 백색광 치석 결과로 §5.3 제외 계산)</li>
 *   <li>UV 분석이 끝난 뒤에야 두 task 를 {@link #cleanupTask} — 그 전에 백색광 task 를
 *       지우면 치석 제외가 적용되지 않는다.</li>
 * </ol>
 * taskId 를 호출부가 먼저 받도록 init 을 분리한 이유: 분석 도중 실패해도 호출부가
 * cleanup 대상 taskId 를 알고 있어야 하기 때문이다.
 */
public interface AiAnalysisClient {

    /**
     * @param missingTeethCsv 결손치 FDI 번호 CSV(예: "18,28"). 없으면 null.
     * @return FastAPI taskId
     */
    String initTask(String missingTeethCsv);

    /** 백색광: preprocess → tooth-area → calculus → report → result(geometry 포함). */
    AiAnalyzeResponse analyzeWhite(
            String taskId,
            Long scanImageId,
            Resource imageResource,
            String filename,
            ViewType viewType,
            Long sessionId
    );

    /**
     * UV: preprocess → tooth-area → plaque-fluorescence → report.
     * plaque-fluorescence 는 반드시 report 전에 호출한다(report 가 UV 이미지 캐시를 비운다).
     *
     * @param calculusTaskId 같은 zone 백색광 task. 없거나 백색광 분석이 실패했으면 null
     *                       (FastAPI 가 치석 제외를 건너뛰고 calculusCrossCheck.applied=false 로 응답)
     */
    AiAnalyzeResponse analyzeUv(
            String taskId,
            Long scanImageId,
            Resource imageResource,
            String filename,
            ViewType viewType,
            Long sessionId,
            String calculusTaskId
    );

    /**
     * FastAPI task_store 정리. 실패해도 예외를 던지지 않는다(로그만 남김).
     * report 전에 실패한 task 는 FastAPI 가 "아직 완료되지 않은 Task" 로 거부하고 지우지 않는다.
     */
    void cleanupTask(String taskId);

    /**
     * 촬영 직후 경량 화질/구도 판정. DB/스토리지에 아무것도 저장하지 않는다.
     *
     * @param missingTeethCsv 결손치 FDI 번호 CSV(예: "18,28,38,48"). 없으면 null.
     */
    CaptureQualityResponse checkQuality(
            Resource imageResource,
            String filename,
            ViewType viewType,
            LightType lightType,
            String missingTeethCsv
    );
}
