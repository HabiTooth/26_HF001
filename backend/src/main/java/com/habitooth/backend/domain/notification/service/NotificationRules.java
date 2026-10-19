package com.habitooth.backend.domain.notification.service;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.notification.dto.NotificationCommand;
import com.habitooth.backend.domain.notification.type.NotificationType;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

/**
 * 알림 문구·경로·dedupe_key 규칙. FE {@code src/lib/notifications/rules.ts} 를 그대로 이관한 것.
 * 문구를 바꾸려면 여기(그리고 rules.ts)를 함께 수정한다.
 */
public final class NotificationRules {

    public static final int REMIND_AFTER_DAYS = 3;
    public static final int CHECKUP_INTERVAL_DAYS = 182;
    private static final Set<Integer> STREAK_MILESTONES = Set.of(3, 7, 14, 30, 100);
    private static final DateTimeFormatter YEAR_MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private NotificationRules() {
    }

    /** REPORT_READY — 분석 완료. score 가 null 이면 점수 문구를 뺀다. */
    public static NotificationCommand reportReady(long sessionId, Integer score) {
        String body = (score == null)
                ? "결과를 확인해 보세요."
                : "이번 스캔 점수는 " + score + "점이에요.";
        return new NotificationCommand(
                NotificationType.REPORT_READY,
                "분석 리포트가 준비됐어요",
                body,
                "/report/" + sessionId,
                "REPORT_READY:" + sessionId
        );
    }

    /**
     * RISK_ALERT — HIGH/CRITICAL 병변이 있을 때만. {@code categories} 는 병변 종류별 대표 위험도(중복 없음).
     * 하나도 위험하지 않으면 null.
     */
    public static NotificationCommand riskAlert(List<LesionRisk> categories, Long sessionId) {
        List<LesionRisk> worrying = categories.stream()
                .filter(c -> c.riskLevel() == RiskLevel.HIGH || c.riskLevel() == RiskLevel.CRITICAL)
                .toList();
        if (worrying.isEmpty()) {
            return null;
        }

        String names = worrying.stream()
                .map(c -> c.lesionType().getLabel())
                .reduce((a, b) -> a + "·" + b)
                .orElse("");
        RiskLevel level = worrying.stream().anyMatch(c -> c.riskLevel() == RiskLevel.CRITICAL)
                ? RiskLevel.CRITICAL
                : RiskLevel.HIGH;

        return new NotificationCommand(
                NotificationType.RISK_ALERT,
                names + " 위험도가 '" + level.getLabel() + "'예요",
                "리포트에서 어느 부위인지 확인해 보세요.",
                sessionId != null ? "/report/" + sessionId : "/dashboard",
                "RISK_ALERT:" + (sessionId != null ? sessionId : LocalDate.now())
        );
    }

    /** SCAN_REMINDER — 마지막 스캔 이후 경과일. 호출 측에서 {@code days >= REMIND_AFTER_DAYS} 를 보장한다. */
    public static NotificationCommand scanReminder(int days, LocalDate today) {
        return new NotificationCommand(
                NotificationType.SCAN_REMINDER,
                days + "일째 스캔 기록이 없어요",
                "오늘 한 번 찍어두면 변화를 이어서 볼 수 있어요.",
                "/scan",
                "SCAN_REMINDER:" + today
        );
    }

    /** STREAK — 연속 스캔 일수가 마일스톤(3·7·14·30·100)일 때만. 아니면 null. */
    public static NotificationCommand streakReached(int days) {
        if (!STREAK_MILESTONES.contains(days)) {
            return null;
        }
        return new NotificationCommand(
                NotificationType.STREAK,
                days + "일 연속 스캔했어요",
                "꾸준히 기록하면 변화가 더 잘 보여요.",
                "/streak",
                "STREAK:" + days
        );
    }

    /** CHECKUP — 마지막 치과 방문 이후 경과일. 호출 측에서 {@code days >= CHECKUP_INTERVAL_DAYS} 를 보장한다. */
    public static NotificationCommand checkupDue(int days, LocalDate today) {
        return new NotificationCommand(
                NotificationType.CHECKUP,
                "정기 검진 받을 때가 됐어요",
                "마지막 치과 방문이 " + (days / 30) + "개월 전이에요.",
                "/clinics",
                "CHECKUP:" + today.format(YEAR_MONTH)
        );
    }

    /** 병변 종류별 대표 위험도. */
    public record LesionRisk(LesionType lesionType, RiskLevel riskLevel) {
    }
}
