package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiBaseResponse {
    // FastAPI 는 실패도 HTTP 200 으로 주므로 이 플래그가 유일한 성공 판정 기준이다.
    // primitive boolean 으로 바꾸면 Jackson 이 "success" 로 매핑하므로 래퍼 + 명시 이름을 유지할 것.
    @JsonProperty("isSuccess")
    private Boolean isSuccess;
    private String message;
}
