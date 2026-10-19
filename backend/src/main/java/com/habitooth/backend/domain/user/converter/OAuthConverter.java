package com.habitooth.backend.domain.user.converter;

import com.habitooth.backend.domain.user.entity.SocialProvider;
import com.habitooth.backend.domain.user.entity.User;

import java.util.Map;

public class OAuthConverter {

    // 소셜 사용자 정보 → User Entity 변환
    public static User toUser(Map<String, String> userInfo, SocialProvider provider) {
        return User.builder()
                .email(userInfo.get("email"))
                .password(null) // 소셜 로그인은 비밀번호 없음
                .name(userInfo.get("name"))
                .birthDate(null) // 소셜 로그인은 생년월일 없음
                .provider(provider)
                .build();
    }
}