package com.habitooth.backend.domain.scan.controller;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.dto.request.ScanImageUploadRequest;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUploadResponse;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/scan")
@Tag(name = "Scan API", description = "촬영 이미지 업로드 관련 API")
public class ScanController {

    private final ScanImageService scanService;

    @Operation(summary = "촬영 이미지 업로드")
    @PostMapping(value = "/upload", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ApiResponse<ScanImageUploadResponse> uploadImage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam LightType lightType,
            @RequestParam ViewType viewType,
            @RequestPart("file") MultipartFile file
    ) {
        Long userId = userDetails.getUserId();

        ScanImageUploadRequest request = ScanImageUploadRequest.builder()
                .userId(userId)
                .imageType(lightType)
                .region(viewType)
                .build();

        ScanImageUploadResponse response = scanService.uploadImage(request, file);

        return ApiResponse.success(response);
    }
}
