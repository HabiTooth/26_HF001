package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

/**
 * 요청 {@code prevTeeth[]} 항목.
 *
 * <p>v1 은 {@code [[16, "CALCULUS"]]} 2원소 배열이었다. areaRatio 를 함께 보내 LLM 서버가
 * 신규/유지/해소뿐 아니라 "유지되었지만 넓어졌다"까지 판정할 수 있게 객체형으로 바꿨다.
 * 서버는 두 형식을 모두 받으므로 동시 배포가 필요하지 않다.
 */
@Getter
@Builder
public class EevePrevIssue {

    private Integer toothNumber;
    private String lesionType;
    private Double areaRatio;
}
