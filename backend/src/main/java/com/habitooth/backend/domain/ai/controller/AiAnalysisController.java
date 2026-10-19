package com.habitooth.backend.domain.ai.controller;

import com.habitooth.backend.domain.ai.dto.request.AiAnalyzeRequest;
import com.habitooth.backend.domain.ai.dto.response.*;
import com.habitooth.backend.domain.ai.service.AiAnalysisService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai")
@Tag(name = "AI 분석 API", description = "AI 기반 치아 영역 및 치석 분석 관련 API")
public class AiAnalysisController {

    private final AiAnalysisService aiAnalysisService;
    @Operation(
            summary = "AI 분석 실행",
            description = " 촬영 이미지 ID를 기반으로 임시 FastAPI 서버에 분석을 요청합니다."
    )
    @PostMapping("/analyze")
    public ApiResponse<AiAnalyzeResponse> analyze(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AiAnalyzeRequest request
    ) {
        AiAnalyzeResponse response = aiAnalysisService.analyzeSingleImage(
            userDetails.getUserId(),
            request
        );
        return ApiResponse.success(response);
    }

}

