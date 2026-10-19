package com.habitooth.backend.domain.user.converter;

import com.habitooth.backend.domain.user.dto.request.SignUpRequest;
import com.habitooth.backend.domain.user.dto.response.LoginResponse;
import com.habitooth.backend.domain.user.entity.SocialProvider;
import com.habitooth.backend.domain.user.entity.User;

public class AuthConverter {

    // SignUpRequest → User Entity 변환
    public static User toUser(SignUpRequest request, String encodedPassword) {
        return User.builder()
                .email(request.getEmail())
                .password(encodedPassword)
                .name(request.getName())
                .birthDate(request.getBirthDate())
                .provider(SocialProvider.EMAIL)
                .build();
    }

    // accessToken → LoginResponse 변환
    public static LoginResponse toLoginResponse(String accessToken) {
        return new LoginResponse(accessToken);
    }
}