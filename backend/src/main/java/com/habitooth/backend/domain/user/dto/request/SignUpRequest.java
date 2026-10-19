package com.habitooth.backend.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class SignUpRequest {
    private String email;
    private String password;
    private String name;
    private LocalDate birthDate;
}