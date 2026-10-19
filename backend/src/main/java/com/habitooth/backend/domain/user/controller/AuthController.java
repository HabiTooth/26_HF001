package com.habitooth.backend.domain.user.controller;

import com.habitooth.backend.domain.user.dto.request.SocialLoginRequest;
import com.habitooth.backend.domain.user.dto.request.LoginRequest;
import com.habitooth.backend.domain.user.dto.request.SignUpRequest;
import com.habitooth.backend.domain.user.dto.response.LoginResponse;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.domain.user.service.AuthService;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth") // 공통 경로
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "회원가입 및 로그인 관련 API")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup") // 상세 경로 및 Method
    @Operation(summary = "이메일 회원가입 API", description = "이메일/비밀번호/이름/생년월일로 회원가입합니다.")
    public ApiResponse<String> signUp(@RequestBody SignUpRequest request) {
        authService.signUp(request);
        return ApiResponse.success("회원가입이 완료되었습니다.");
    }

    @PostMapping("/login")
    @Operation(summary = "이메일 로그인 API", description = "이메일/비밀번호로 로그인 후 JWT Access Token을 발급합니다.")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response);
    }

    @PostMapping("/social")
    @Operation(summary = "SNS 로그인 API", description = "카카오/구글 OAuth 인가 코드로 로그인 후 JWT Access Token을 발급합니다.")
    public ApiResponse<LoginResponse> socialLogin(@RequestBody SocialLoginRequest request) {
        LoginResponse response = authService.socialLogin(request);
        return ApiResponse.success(response);
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
            summary = "로그아웃 API",
            description = "서버는 Access Token을 무효화하지 않습니다. 클라이언트에서 저장된 Access Token을 직접 삭제해야 로그아웃이 완료됩니다."
    )
    public ApiResponse<String> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.logout(userDetails.getUserId());
        return ApiResponse.success("로그아웃되었습니다.");
    }
}