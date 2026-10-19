package com.habitooth.backend.domain.mypage.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ToothProfileUpdateRequest(

        @Schema(description = "결손치 FDI 번호 목록. 결손치가 없으면 빈 배열을 보낸다.", example = "[18, 28, 38, 48]")
        @NotNull
        List<@Min(11) @Max(48) Integer> missingTeeth
) {
}
