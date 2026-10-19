package com.habitooth.backend.domain.scan.dto.response;

import com.habitooth.backend.domain.scan.dto.ToothSummary;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MeshCoordinateResponse {
    private Long sessionId;
    private Integer averageScore;  // 세션 종합 점수(정수). 유효 구역이 없으면 0
    private List<ToothSummary> toothSummaries;
}
