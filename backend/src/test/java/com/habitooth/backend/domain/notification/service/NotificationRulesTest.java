package com.habitooth.backend.domain.notification.service;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.notification.dto.NotificationCommand;
import com.habitooth.backend.domain.notification.service.NotificationRules.LesionRisk;
import com.habitooth.backend.domain.notification.type.NotificationType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationRulesTest {

    @Test
    @DisplayName("REPORT_READY - 점수 있으면 점수 문구, dedupe=REPORT_READY:{sessionId}")
    void reportReady_withScore() {
        NotificationCommand c = NotificationRules.reportReady(57, 84);

        assertThat(c.type()).isEqualTo(NotificationType.REPORT_READY);
        assertThat(c.title()).isEqualTo("분석 리포트가 준비됐어요");
        assertThat(c.body()).isEqualTo("이번 스캔 점수는 84점이에요.");
        assertThat(c.link()).isEqualTo("/report/57");
        assertThat(c.dedupeKey()).isEqualTo("REPORT_READY:57");
    }

    @Test
    @DisplayName("REPORT_READY - 점수 null이면 일반 문구")
    void reportReady_nullScore() {
        assertThat(NotificationRules.reportReady(57, null).body()).isEqualTo("결과를 확인해 보세요.");
    }

    @Test
    @DisplayName("RISK_ALERT - HIGH/CRITICAL 없으면 null")
    void riskAlert_noneWorrying() {
        List<LesionRisk> cats = List.of(
                new LesionRisk(LesionType.PLAQUE, RiskLevel.MEDIUM),
                new LesionRisk(LesionType.CALCULUS, RiskLevel.LOW));
        assertThat(NotificationRules.riskAlert(cats, 57L)).isNull();
    }

    @Test
    @DisplayName("RISK_ALERT - 치석 HIGH 하나")
    void riskAlert_singleHigh() {
        NotificationCommand c = NotificationRules.riskAlert(
                List.of(new LesionRisk(LesionType.CALCULUS, RiskLevel.HIGH)), 57L);

        assertThat(c.type()).isEqualTo(NotificationType.RISK_ALERT);
        assertThat(c.title()).isEqualTo("치석 위험도가 '위험'예요");
        assertThat(c.link()).isEqualTo("/report/57");
        assertThat(c.dedupeKey()).isEqualTo("RISK_ALERT:57");
    }

    @Test
    @DisplayName("RISK_ALERT - 치태 CRITICAL + 치석 HIGH → '매우 위험', 이름 결합")
    void riskAlert_multiWithCritical() {
        NotificationCommand c = NotificationRules.riskAlert(List.of(
                new LesionRisk(LesionType.PLAQUE, RiskLevel.CRITICAL),
                new LesionRisk(LesionType.CALCULUS, RiskLevel.HIGH)), 57L);

        assertThat(c.title()).isEqualTo("치태·치석 위험도가 '매우 위험'예요");
    }

    @Test
    @DisplayName("SCAN_REMINDER - 경과일 문구 + dedupe=SCAN_REMINDER:{today}")
    void scanReminder() {
        LocalDate today = LocalDate.of(2026, 9, 4);
        NotificationCommand c = NotificationRules.scanReminder(5, today);

        assertThat(c.type()).isEqualTo(NotificationType.SCAN_REMINDER);
        assertThat(c.title()).isEqualTo("5일째 스캔 기록이 없어요");
        assertThat(c.link()).isEqualTo("/scan");
        assertThat(c.dedupeKey()).isEqualTo("SCAN_REMINDER:2026-09-04");
    }

    @Test
    @DisplayName("CHECKUP - 경과 개월 수 문구 + dedupe=CHECKUP:{yyyy-MM}")
    void checkupDue() {
        LocalDate today = LocalDate.of(2026, 9, 4);
        NotificationCommand c = NotificationRules.checkupDue(200, today);

        assertThat(c.type()).isEqualTo(NotificationType.CHECKUP);
        assertThat(c.title()).isEqualTo("정기 검진 받을 때가 됐어요");
        assertThat(c.body()).isEqualTo("마지막 치과 방문이 6개월 전이에요.");
        assertThat(c.link()).isEqualTo("/clinics");
        assertThat(c.dedupeKey()).isEqualTo("CHECKUP:2026-09");
    }

    @Test
    @DisplayName("STREAK - 마일스톤만 생성 (3·7·14·30·100)")
    void streak_milestonesOnly() {
        assertThat(NotificationRules.streakReached(3)).isNotNull();
        assertThat(NotificationRules.streakReached(100).dedupeKey()).isEqualTo("STREAK:100");
        assertThat(NotificationRules.streakReached(3).title()).isEqualTo("3일 연속 스캔했어요");
        assertThat(NotificationRules.streakReached(5)).isNull();
        assertThat(NotificationRules.streakReached(0)).isNull();
    }
}
