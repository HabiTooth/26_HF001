package com.habitooth.backend.domain.dashboard.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DashboardScoreResponse {
    private Long sessionId;
    private Integer score;       // 세션 종합 점수(정수). 유효 구역이 없으면 0
    private Integer scoreDiff;   // 이전 세션 대비 점수 차이 (null = 이전 세션 없음)
    private LocalDateTime scannedAt;
}
