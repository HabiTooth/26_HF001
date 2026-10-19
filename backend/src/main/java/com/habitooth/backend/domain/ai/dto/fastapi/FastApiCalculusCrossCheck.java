package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * plaque-fluorescence 응답의 calculusCrossCheck — 백색광 치석 영역을 UV 치태 후보에서
 * 뺐는지(§5.3)에 대한 진단 정보.
 *
 * <p>matchedTeeth 는 보통 FDI 번호지만 같은 task 에서 calculus 를 돌린 경우 "same-image"
 * 문자열이 들어오므로 String 목록으로 받는다.
 */
@Getter
@NoArgsConstructor
public class FastApiCalculusCrossCheck {
    @JsonProperty("applied")
    private Boolean applied;
    private String sourceTaskId;
    private List<String> matchedTeeth;
    private List<String> unmatchedTeeth;
    private String reason;
    private Long calculusPixels;
}
