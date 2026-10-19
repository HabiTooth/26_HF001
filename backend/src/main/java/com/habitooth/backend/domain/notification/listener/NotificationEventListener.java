package com.habitooth.backend.domain.notification.listener;

import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.event.SessionAnalyzedEvent;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.notification.service.NotificationRules;
import com.habitooth.backend.domain.notification.service.NotificationRules.LesionRisk;
import com.habitooth.backend.domain.notification.service.NotificationService;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 분석 완료 시점의 즉시 알림 생성. 분석 트랜잭션 커밋 이후에 별도 트랜잭션으로 동작하므로
 * 여기서 실패해도 분석 결과 저장은 롤백되지 않는다. 알림 종류별로 격리한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final NotificationService notificationService;
    private final AnalysisResultRepository analysisResultRepository;
    private final ScanSessionRepository scanSessionRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onSessionAnalyzed(SessionAnalyzedEvent event) {
        Long userId = event.userId();
        Long sessionId = event.sessionId();

        safely("REPORT_READY", sessionId, () ->
                notificationService.create(userId,
                        NotificationRules.reportReady(sessionId, event.sessionScore())));

        safely("RISK_ALERT", sessionId, () ->
                notificationService.create(userId,
                        NotificationRules.riskAlert(lesionRisks(sessionId), sessionId)));

        safely("STREAK", sessionId, () -> {
            int streak = currentScanStreak(userId);
            notificationService.create(userId, NotificationRules.streakReached(streak));
        });
    }

    /** 세션의 병변 종류별 대표(최대) 위험도. */
    private List<LesionRisk> lesionRisks(Long sessionId) {
        Map<LesionType, RiskLevel> maxByLesion = new EnumMap<>(LesionType.class);

        analysisResultRepository.findLatestSuccessBySessionId(sessionId).stream()
                .flatMap(result -> result.getToothAreas().stream())
                .filter(area -> area.getLesionType() != null && area.getRiskLevel() != null)
                .forEach(area -> maxByLesion.merge(
                        area.getLesionType(),
                        area.getRiskLevel(),
                        (a, b) -> a.ordinal() >= b.ordinal() ? a : b));

        return maxByLesion.entrySet().stream()
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .map(e -> new LesionRisk(e.getKey(), e.getValue()))
                .toList();
    }

    /** 오늘(KST) 기준 연속 스캔 일수. 최근 스캔이 어제보다 전이면 0. */
    private int currentScanStreak(Long userId) {
        Set<LocalDate> dates = scanSessionRepository.findRecentCompletedDatesDesc(userId).stream()
                .map(java.sql.Date::toLocalDate)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));
        if (dates.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now(KST);
        LocalDate anchor = dates.stream().max(LocalDate::compareTo).orElseThrow();
        if (anchor.isBefore(today.minusDays(1))) {
            return 0;
        }

        int streak = 0;
        for (LocalDate cur = anchor; dates.contains(cur); cur = cur.minusDays(1)) {
            streak++;
        }
        return streak;
    }

    private void safely(String label, Long sessionId, Runnable task) {
        try {
            task.run();
        } catch (Exception e) {
            log.error("알림 생성 실패 - {} sessionId={}", label, sessionId, e);
        }
    }
}
