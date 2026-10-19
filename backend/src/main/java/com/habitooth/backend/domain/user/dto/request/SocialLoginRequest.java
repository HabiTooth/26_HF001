package com.habitooth.backend.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SocialLoginRequest {
    private String provider;    // "kakao" 또는 "google"
    private String authCode;    // OAuth 인가 코드
    private String redirectUri; // 인가 요청 시 사용한 redirectUri와 동일해야 함
}