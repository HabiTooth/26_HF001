package com.habitooth.backend.domain.ai.repository;

import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AnalysisDetectedIssueRepository extends JpaRepository<AnalysisDetectedIssue, Long> {

    /**
     * 세션에 속한 이미지들의 병변 목록을, 이미지별 <b>가장 최근 성공</b> 분석 결과 1건 기준으로 조회한다.
     *
     * <p>세션 분석은 여러 번 재요청될 수 있고 그때마다 AnalysisResult 와 자식 병변 행이 새로
     * 쌓인다. 예전 쿼리는 세션의 모든 행을 그냥 다 가져와서, 재분석할수록 같은 병변 폴리곤이
     * 중복으로 3D 메시에 올라갔다. 점수 집계
     * ({@code AnalysisResultRepository.findLatestSuccessBySessionId})와 같은 기준으로 맞춘다.
     */
    default List<AnalysisDetectedIssue> findAllBySessionId(Long sessionId) {
        return findLatestSuccessBySessionId(sessionId, AnalysisStatus.SUCCESS);
    }

    @Query("""
            SELECT adi
            FROM AnalysisDetectedIssue adi
            JOIN FETCH adi.analysisResult ar
            JOIN ar.scanImage si
            WHERE si.scanSession.id = :sessionId
              AND ar.analysisStatus = :status
              AND ar.id = (
                  SELECT MAX(ar2.id)
                  FROM AnalysisResult ar2
                  WHERE ar2.scanImage.id = ar.scanImage.id
                    AND ar2.analysisStatus = :status
              )
            """)
    List<AnalysisDetectedIssue> findLatestSuccessBySessionId(
            @Param("sessionId") Long sessionId,
            @Param("status") AnalysisStatus status
    );
}