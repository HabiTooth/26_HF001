package com.habitooth.backend.domain.mypage.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record ProfileUpdateRequest(

        @Schema(description = "이름", example = "홍길동")
        @NotBlank
        String name,

        @Schema(description = "생년월일", example = "1995-03-15")
        LocalDate birthDate,

        @Schema(description = "마지막 치과 방문일", example = "2026-03-01")
        LocalDate lastDentalVisitAt
) {
}
