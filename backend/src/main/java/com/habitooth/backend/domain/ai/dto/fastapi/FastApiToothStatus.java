package com.habitooth.backend.domain.ai.dto.fastapi;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiToothStatus {
    private Integer toothNumber;
    /** 2.3: 촬영면(INNER/OUTER). Spring 은 viewType 으로 알 수 있어 저장하지 않는다. */
    private String surface;
    /** 2.3: DETECTED / NOT_DETECTED. 구버전은 null(=DETECTED). NOT_DETECTED 는 areaRatio/toothScore 가 null, riskLevel 이 "UNKNOWN". */
    private String status;
    private String lesionType;
    private Double areaRatio;
    /** FastAPI 가 계산한 치아 점수(0~100). Spring 은 재계산하지 않고 그대로 저장한다. */
    private Double toothScore;
    private String riskLevel;
}
