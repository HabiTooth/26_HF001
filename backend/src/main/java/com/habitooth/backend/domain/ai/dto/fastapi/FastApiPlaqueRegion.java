package com.habitooth.backend.domain.ai.dto.fastapi;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * UV 형광 치태 분석에서 검출된 개별 치태 후보 영역(contour).
 * 모델 기반 검출({@link FastApiDetectedIssue})과 달리 색 정보 기반이라 confidence 가 없다.
 */
@Getter
@NoArgsConstructor
public class FastApiPlaqueRegion {
    private Integer regionId;
    private Integer pixelCount;
    private List<FastApiPoint> polygon;
}
