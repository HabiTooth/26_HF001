package com.habitooth.backend.domain.mypage.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record ToothProfileResponse(

        @Schema(description = "치아 프로필 설정 여부(결손치가 0개여도 설정을 마쳤으면 true)", example = "true")
        boolean isSet,

        @Schema(description = "결손치 FDI 번호 목록", example = "[18, 28, 38, 48]")
        List<Integer> missingTeeth
) {
}
