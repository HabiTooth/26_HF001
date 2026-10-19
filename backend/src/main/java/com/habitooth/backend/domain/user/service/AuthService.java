package com.habitooth.backend.domain.user.service;

import com.habitooth.backend.domain.user.config.JwtTokenProvider;
import com.habitooth.backend.domain.user.dto.request.SocialLoginRequest;
import com.habitooth.backend.domain.user.converter.AuthConverter;
import com.habitooth.backend.domain.user.dto.request.LoginRequest;
import com.habitooth.backend.domain.user.dto.request.SignUpRequest;
import com.habitooth.backend.domain.user.dto.response.LoginResponse;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.AuthHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.domain.user.converter.OAuthConverter;
import com.habitooth.backend.domain.user.entity.SocialProvider;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;


@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoOAuthService kakaoOAuthService;
    private final GoogleOAuthService googleOAuthService;

    @Transactional
    public void signUp(SignUpRequest request) {
        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthHandler(ErrorCode.DUPLICATED_EMAIL);
        }

        // 패스워드 암호화
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // User 객체 생성
        User newUser = AuthConverter.toUser(request, encodedPassword);

        //  DB에 저장
        userRepository.save(newUser);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // 이메일로 유저 찾기 (없으면 예외 발생)
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthHandler(ErrorCode.USER_NOT_FOUND));

        // 비밀번호 일치 여부 확인
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AuthHandler(ErrorCode.INVALID_PASSWORD);
        }

        // 검증 성공 시 JWT 토큰 발급
        String accessToken = jwtTokenProvider.createToken(user.getId(), user.getEmail());

        return AuthConverter.toLoginResponse(accessToken);
    }

    @Transactional
    public LoginResponse socialLogin(SocialLoginRequest request) {
        // provider 확인
        SocialProvider provider;
        Map<String, String> userInfo;

        if ("kakao".equalsIgnoreCase(request.getProvider())) {
            provider = SocialProvider.KAKAO;
            String accessToken = kakaoOAuthService.getAccessToken(request.getAuthCode(), request.getRedirectUri());
            userInfo = kakaoOAuthService.getUserInfo(accessToken);
        } else if ("google".equalsIgnoreCase(request.getProvider())) {
            provider = SocialProvider.GOOGLE;
            String accessToken = googleOAuthService.getAccessToken(request.getAuthCode(), request.getRedirectUri());
            userInfo = googleOAuthService.getUserInfo(accessToken);
        } else {
            throw new CustomException(ErrorCode.UNSUPPORTED_PROVIDER);
        }

        // 기존 회원이면 로그인, 신규 회원이면 자동 회원가입
        User user = userRepository.findByEmail(userInfo.get("email"))
                .orElseGet(() -> userRepository.save(OAuthConverter.toUser(userInfo, provider)));

        String accessToken = jwtTokenProvider.createToken(user.getId(), user.getEmail());
        return AuthConverter.toLoginResponse(accessToken);
    }

    // 서버는 토큰을 무효화하지 않음(클라이언트 측 폐기 방식) — 로그아웃 시각만 기록
    public void logout(Long userId) {
        log.info("[LOGOUT] userId={} 로그아웃", userId);
    }
}