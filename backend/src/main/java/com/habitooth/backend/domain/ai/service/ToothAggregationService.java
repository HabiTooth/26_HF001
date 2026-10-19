package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.entity.ToothStatus;
import com.habitooth.backend.domain.ai.repository.AnalysisDetectedIssueRepository;
import com.habitooth.backend.domain.ai.repository.ToothStatusRepository;
import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @deprecated confidence(검출 확신도)를 calculusRatio/riskLevel 로 환산하던 잘못된 집계.
 * confidence 는 위험도가 아니다. 치아 단위 상태의 정본은 {@code AnalysisToothArea}
 * (FastAPI 가 계산한 areaRatio/riskLevel) 이며, 세션 리포트는 이제 그것을 직접 사용한다.
 * 호출 경로(ReportService)는 제거되었다. tooth_status 테이블 정리 후 이 클래스도 삭제할 것.
 */
@Deprecated
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ToothAggregationService {

    private final AnalysisDetectedIssueRepository analysisDetectedIssueRepository;
    private final ToothStatusRepository toothStatusRepository;

    /**
     * 다중 이미지 중복 검출 이슈를 치아 번호(FDI) 단위 최댓값 기준으로 평탄화하여 DB에 적재합니다.
     * @param sessionId 촬영 세션 ID
     * @return 집계 완료되어 저장된 ToothStatus 엔티티 목록
     */
    public List<ToothStatus> aggregate(Long sessionId) {
        // 1. 세션의 모든 이미지에서 검출된 이슈 리스트 한방에 긁어오기
        List<AnalysisDetectedIssue> rawIssues = analysisDetectedIssueRepository.findAllBySessionId(sessionId);
        if (rawIssues.isEmpty()) {
            return List.of();
        }

        // 2. 실제 FDI 치아 번호가 할당된 데이터만 그룹핑
        Map<Integer, List<AnalysisDetectedIssue>> groupByTooth = rawIssues.stream()
                .filter(issue -> issue.getToothNumber() != null)
                .collect(Collectors.groupingBy(AnalysisDetectedIssue::getToothNumber));

        List<ToothStatus> aggregatedList = new ArrayList<>();

        // 3. 치아별 평탄화 연산 및 데이터베이스 적재
        for (Map.Entry<Integer, List<AnalysisDetectedIssue>> entry : groupByTooth.entrySet()) {
            Integer toothNumber = entry.getKey();
            List<AnalysisDetectedIssue> issueList = entry.getValue();

            // 동일 치아의 치석(CALCULUS) 결과 중 가장 신뢰도가 높은 최댓값 추출
            double maxCalculusConf = issueList.stream()
                    .filter(i -> "CALCULUS".equalsIgnoreCase(i.getLesionType().name()))
                    .mapToDouble(AnalysisDetectedIssue::getConfidence)
                    .max()
                    .orElse(0.0);

            // 동일 치아의 치태(PLAQUE) 결과 중 최댓값 추출
            double maxPlaqueConf = issueList.stream()
                    .filter(i -> "PLAQUE".equalsIgnoreCase(i.getLesionType().name()))
                    .mapToDouble(AnalysisDetectedIssue::getConfidence)
                    .max()
                    .orElse(0.0);

            // 위험도 레벨(RiskLevel) 산정 규칙 대입 (기존 구조 활용)
            RiskLevel finalRiskLevel = evaluateRisk(maxCalculusConf, maxPlaqueConf);

            ToothStatus status = ToothStatus.builder()
                    .sessionId(sessionId) // ERD 기준 컬럼명 매핑 (외래키)
                    .toothNumber(toothNumber)
                    .riskLevel(finalRiskLevel)
                    .calculusRatio((Double) maxCalculusConf * 100) // % 단위 스케일링
                    .plaqueRatio((Double) maxPlaqueConf * 100)
                    .build();

            toothStatusRepository.save(status);
            aggregatedList.add(status);
        }

        return aggregatedList;
    }

    /**
     * 치석 및 치태의 최대 신뢰도를 기반으로 종합 위험도를 평가합니다.
     */
    private RiskLevel evaluateRisk(double calculusConf, double plaqueConf) {
        double maxConf = Math.max(calculusConf, plaqueConf);

        if (maxConf >= 0.9) return RiskLevel.CRITICAL;
        if (maxConf >= 0.75) return RiskLevel.HIGH;
        if (maxConf >= 0.5) return RiskLevel.MEDIUM;
        if (maxConf >= 0.25) return RiskLevel.LOW;
        return RiskLevel.VERY_LOW;
    }
}