package com.habitooth.backend.domain.ai.dto.fastapi;


import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiResultData {
    private Integer sessionId;
    /** 백색광(calculus 실행) task 의 구역 점수. UV 전용 task 는 null — 치태 점수는 Spring 이 계산한다. */
    private Double zoneScore;
    @JsonProperty("zoneValid")
    private Boolean zoneValid;
    private Integer detectedToothCount;
    /** 2.3: 구역의 기대 치아 수(핵심 시퀀스 − 결손치). 구버전은 null. */
    private Integer expectedToothCount;
    /** 2.3: 검출 치아 / 기대 치아. 0.6 미만이면 FastAPI 가 구역을 무효로 본다. */
    private Double coverageRatio;
    /** 2.3: UV task 의 형광 치태 구역 점수(치아 점수 단순 평균). 무효 구역이면 null. 구버전은 null → Spring 계산. */
    private Double fluorescenceZoneScore;
    /** 2.3: UV 구역 유효 여부. 이 값이 null 이면 구버전 응답으로 보고 Spring 이 UV 점수를 계산한다. */
    private Boolean fluorescenceZoneValid;
    private String scoreVersion;
    private FastApiSummary summary;
    private List<FastApiToothStatus> toothStatuses;

    /** UV 형광 치태 분석을 돌린 경우에만 채워진다. 미실행 시 빈 배열. */
    private List<FastApiFluorescenceToothStatus> fluorescenceToothStatuses;

    /** include_overlay=true 로 요청했을 때만 채워지는 사용자용 오버레이(result.overlay). 구버전 FastAPI 는 null. */
    private FastApiOverlay overlay;

    /** 시연용으로 FastAPI 서버에 저장한 결과 폴더 경로. 로그에만 남기고 저장하지 않는다. */
    private String demoOutputDir;
}
