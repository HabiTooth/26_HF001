package com.habitooth.backend.domain.ai.event;

/**
 * 세션 단위 AI 분석이 완료(COMPLETED)됐을 때 발행. 알림(REPORT_READY / RISK_ALERT / STREAK) 생성의 트리거.
 * {@code @TransactionalEventListener(AFTER_COMMIT)} 로 소비하므로, 알림 생성 실패가 분석 트랜잭션을 롤백하지 않는다.
 *
 * @param userId       분석을 실행한 사용자
 * @param sessionId    완료된 촬영 세션
 * @param sessionScore 세션 종합 점수(0~100). 유효 구역이 없으면 null.
 */
public record SessionAnalyzedEvent(Long userId, Long sessionId, Integer sessionScore) {
}
