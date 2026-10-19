package com.habitooth.backend.domain.ai.repository;

import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AnalysisToothAreaRepository extends JpaRepository<AnalysisToothArea, Long> {

    /**
     * 치아 면적비 추이용: 사용자의 COMPLETED 세션 전체에서 특정 치아(FDI)의 상태를 세션 최신순으로 반환한다.
     */
    default List<AnalysisToothArea> findLatestSuccessByUserIdAndTooth(
            Long userId, int toothNumber, Collection<ViewType> viewTypes, LightType lightType
    ) {
        return findLatestByUserIdAndToothAndStatus(
                userId, toothNumber, viewTypes, lightType,
                ScanSessionStatus.COMPLETED, AnalysisStatus.SUCCESS, ToothDetectionStatus.DETECTED);
    }

    @Query("""
            SELECT ta
            FROM AnalysisToothArea ta
            JOIN FETCH ta.analysisResult ar
            JOIN FETCH ar.scanImage si
            JOIN FETCH si.scanSession s
            WHERE s.userId = :userId
              AND s.status = :sessionStatus
              AND s.deletedAt IS NULL
              AND ta.toothNumber = :toothNumber
              AND ta.status = :detectionStatus
              AND ar.viewType IN :viewTypes
              AND si.lightType = :lightType
              AND ar.analysisStatus = :status
              AND ar.id = (
                  SELECT MAX(ar2.id)
                  FROM AnalysisResult ar2
                  WHERE ar2.scanImage.id = ar.scanImage.id
                    AND ar2.analysisStatus = :status
              )
            ORDER BY s.startedAt DESC, ar.id DESC
            """)
    List<AnalysisToothArea> findLatestByUserIdAndToothAndStatus(
            @Param("userId") Long userId,
            @Param("toothNumber") int toothNumber,
            @Param("viewTypes") Collection<ViewType> viewTypes,
            @Param("lightType") LightType lightType,
            @Param("sessionStatus") ScanSessionStatus sessionStatus,
            @Param("status") AnalysisStatus status,
            @Param("detectionStatus") ToothDetectionStatus detectionStatus
    );
}
