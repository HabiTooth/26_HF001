package com.habitooth.backend.domain.ai.dto.fastapi;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자용 오버레이 이미지
 */
@Getter
@NoArgsConstructor
public class FastApiOverlay {
    /** base64 인코딩 이미지 본문 */
    private String image;
    private Integer width;
    private Integer height;
    /** 현재는 항상 "png" */
    private String format;
}
