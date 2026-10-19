package com.habitooth.backend.domain.scan.controller;

import com.habitooth.backend.domain.ai.dto.response.CaptureQualityResponse;
import com.habitooth.backend.domain.ai.dto.response.SessionAnalysisResult;
import com.habitooth.backend.domain.ai.dto.response.SessionAnalyzeResponse;
import com.habitooth.backend.domain.ai.service.AiAnalysisService;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.converter.ScanConverter;
import com.habitooth.backend.domain.scan.dto.request.ScanImageUploadRequestForSession;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUploadResponse;
import com.habitooth.backend.domain.scan.dto.response.ScanCaptureStatusResponse;
import com.habitooth.backend.domain.scan.dto.response.MeshCoordinateResponse;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.domain.scan.service.ScanSessionService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.annotation.SwaggerBody;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Encoding;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/scan-sessions")
@RequiredArgsConstructor
@Tag(name = "Scan Session API", description = "촬영 세션 생성 및 분석 API")
public class ScanSessionController {
    private final ScanSessionService scanSessionService;
    private final ScanImageService scanImageService;
    private final AiAnalysisService aiAnalysisService;

    @Operation(summary = "촬영 세션 생성")
    @PostMapping
    public ApiResponse<Long> createSession(
        @AuthenticationPrincipal CustomUserDetails userDetails,
        @RequestParam Long deviceId
    ) {
        Long sessionId = scanSessionService.createSession(
                userDetails.getUserId(),
                deviceId
        );

        return ApiResponse.success(sessionId);
    }

    @SwaggerBody(content = @Content(encoding = @Encoding(name = "metadata", contentType = MediaType.APPLICATION_JSON_VALUE)))
    @PostMapping(value = "/{sessionId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ScanImageUploadResponse> uploadImageToSession(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId,
            @RequestPart("file") MultipartFile file,
            @RequestPart("metadata") ScanImageUploadRequestForSession request
    ) {
        scanSessionService.validateImageUpload(
                userDetails.getUserId(),
                sessionId,
                request.getViewType(),
                request.getLightType()
        );

        ScanImage scanImage = scanImageService.uploadFileToExistingSession(sessionId, request, file);
        return ApiResponse.success(ScanConverter.toScanImageUploadResponseDTO(scanImage));
    }


    @Operation(
            summary = "촬영 직후 경량 화질 판정",
            description = "정식 업로드 전에 사진 1장의 블러/구도/치아 검출 품질을 가볍게 판정합니다. " +
                    "ScanImage 생성, 파일 저장, AnalysisResult 저장 등 아무것도 하지 않으며 판정 결과만 " +
                    "반환하고 버립니다. needsRetake=true 면 프론트가 그 자리에서 재촬영을 유도하고 " +
                    "정식 업로드 API를 호출하지 않아야 합니다."
    )
    @PostMapping(value = "/{sessionId}/images/quality-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CaptureQualityResponse> checkCaptureQuality(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId,
            @RequestParam MultipartFile file,
            @RequestParam ViewType viewType,
            @RequestParam(required = false) LightType lightType
    ) {
        CaptureQualityResponse response = aiAnalysisService.checkCaptureQuality(
                userDetails.getUserId(), sessionId, file, viewType, lightType
        );
        return ApiResponse.success(response);
    }

    @Operation(
            summary = "세션 촬영 진행 상태 조회",
            description = "13개 구역 중 현재 촬영된 구역과 분석 가능 여부를 반환합니다."
    )
    @GetMapping("/{sessionId}/capture-status")
    public ApiResponse<ScanCaptureStatusResponse> getCaptureStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        return ApiResponse.success(
                scanSessionService.getCaptureStatus(userDetails.getUserId(), sessionId)
        );
    }

    @Operation(summary = "세션 단위 AI 분석 실행", description = "쿼리 파라미터 target(PLAQUE 또는 CALCULUS)이 없으면 전체 분석을, 있으면 해당 병변만 분석합니다.")
    @PostMapping("/{sessionId}/analyze")
    public ApiResponse<SessionAnalyzeResponse> analyzeSession(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId,
            @RequestParam(required = false) LesionType target
    ) {

        SessionAnalysisResult sessionResult =
                aiAnalysisService.analyzeSession(userDetails.getUserId(), sessionId, target);

        return ApiResponse.success(SessionAnalyzeResponse.from(sessionId, sessionResult));
    }

    @Operation(summary = "세션 리포트 조회", description = "본인 세션만 조회할 수 있습니다. 다른 사용자의 세션이면 404를 반환합니다.")
    @GetMapping("/{sessionId}/report")
    public ApiResponse<MeshCoordinateResponse> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long sessionId
    ) {
        MeshCoordinateResponse response =
                scanSessionService.getSessionReport(userDetails.getUserId(), sessionId);

        return ApiResponse.success(response);
    }

}
