package com.habitooth.backend.domain.ai.repository;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {

    Optional<AnalysisResult> findTopByScanImageIdOrderByCreatedAtDesc(Long scanImageId);

    List<AnalysisResult> findAllByScanImage_Id(Long scanImageId);

    List<AnalysisResult> findAllByScanImage_IdIn(List<Long> imageIds);

    Optional<AnalysisResult> findTopByScanImage_IdOrderByCreatedAtDesc(Long scanImageId);

    /**
     * 세션에 속한 각 촬영 이미지(구역)별로 <b>가장 최근에 성공한</b> 분석 결과 1건씩만 반환한다.
     *
     * <p>같은 이미지를 여러 번 분석하면 AnalysisResult 가 계속 쌓이는데, report/dashboard/
     * history/LLM 은 "지금 상태"만 필요하므로 최신 SUCCESS 만 골라야 한다. 예전에는 전체를
     * 평균 내면서 과거·실패(zoneScore=null) 행이 섞여 평균이 0 으로 주저앉았다.
     *
     * <p>점수 집계({@code ScoreCalculator.combineZoneScores})가 행마다 촬영 광원을 봐야 해서
     * ScanImage 를 fetch join 으로 함께 로딩한다.
     */
    default List<AnalysisResult> findLatestSuccessBySessionId(Long sessionId) {
        return findLatestBySessionIdAndStatus(sessionId, AnalysisStatus.SUCCESS);
    }

    @Query("""
            SELECT ar
            FROM AnalysisResult ar
            JOIN FETCH ar.scanImage si
            WHERE si.scanSession.id = :sessionId
              AND ar.analysisStatus = :status
              AND ar.id = (
                  SELECT MAX(ar2.id)
                  FROM AnalysisResult ar2
                  WHERE ar2.scanImage.id = ar.scanImage.id
                    AND ar2.analysisStatus = :status
              )
            """)
    List<AnalysisResult> findLatestBySessionIdAndStatus(
            @Param("sessionId") Long sessionId,
            @Param("status") AnalysisStatus status
    );

    /**
     * 구역 점수 추이용: 사용자의 COMPLETED 세션 전체에서 특정 구역의 이미지별 최신 SUCCESS 결과를
     * 세션 최신순으로 반환한다. 한 구역을 백색광·UV 로 찍은 세션은 행이 2개 나온다.
     *
     * <p>세션마다 {@link #findLatestSuccessBySessionId} 를 돌리면 세션 수만큼 쿼리가 나가므로 한 번에 가져온다.
     * 세션 날짜를 바로 읽을 수 있게 ScanImage → ScanSession 까지 fetch join 한다.
     */
    default List<AnalysisResult> findLatestSuccessByUserIdAndViewType(Long userId, ViewType viewType) {
        return findLatestByUserIdAndViewTypeAndStatus(
                userId, viewType, ScanSessionStatus.COMPLETED, AnalysisStatus.SUCCESS);
    }

    @Query("""
            SELECT ar
            FROM AnalysisResult ar
            JOIN FETCH ar.scanImage si
            JOIN FETCH si.scanSession s
            WHERE s.userId = :userId
              AND s.status = :sessionStatus
              AND s.deletedAt IS NULL
              AND ar.viewType = :viewType
              AND ar.analysisStatus = :status
              AND ar.id = (
                  SELECT MAX(ar2.id)
                  FROM AnalysisResult ar2
                  WHERE ar2.scanImage.id = ar.scanImage.id
                    AND ar2.analysisStatus = :status
              )
            ORDER BY s.startedAt DESC, ar.id DESC
            """)
    List<AnalysisResult> findLatestByUserIdAndViewTypeAndStatus(
            @Param("userId") Long userId,
            @Param("viewType") ViewType viewType,
            @Param("sessionStatus") ScanSessionStatus sessionStatus,
            @Param("status") AnalysisStatus status
    );
}