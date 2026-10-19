package com.habitooth.backend.domain.mypage.dto.response;

import com.habitooth.backend.domain.user.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ProfileResponse {

    @Schema(description = "사용자 ID", example = "1")
    private Long userId;

    @Schema(description = "이메일", example = "user@example.com")
    private String email;

    @Schema(description = "이름", example = "홍길동")
    private String name;

    @Schema(description = "생년월일", example = "1995-03-15")
    private LocalDate birthDate;

    @Schema(description = "마지막 치과 방문일", example = "2026-03-01")
    private LocalDate lastDentalVisitAt;

    public static ProfileResponse from(User user) {
        return ProfileResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .lastDentalVisitAt(user.getLastDentalVisitAt())
                .build();
    }
}
