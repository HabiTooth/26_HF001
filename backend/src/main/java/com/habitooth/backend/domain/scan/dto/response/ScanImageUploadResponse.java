package com.habitooth.backend.domain.scan.dto.response;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScanImageUploadResponse {
    private Long sessionId;
    private Long imageId;
    private LightType lightType;
    private ViewType viewType;
    /** 저장소 내부 경로(/uploads/...). 브라우저가 직접 열 수 없다. 표시용으로는 fileUrl 을 쓸 것. */
    private String imageUrl;
    /** 원본 파일 API 경로(/api/scan-images/{id}/file). 인증 헤더를 붙여 GET 하면 이미지가 온다. */
    private String fileUrl;
}
