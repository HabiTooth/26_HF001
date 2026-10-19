package com.habitooth.backend.domain.scan.controller;

import com.habitooth.backend.domain.scan.dto.response.ScanImageFile;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUrls;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;


@RestController
@RequestMapping(ScanImageUrls.BASE_PATH)
@RequiredArgsConstructor
@Tag(name = "Scan Image API", description = "촬영 이미지 원본·분석 오버레이 파일 조회")
@SecurityRequirement(name = "bearerAuth")
public class ScanImageController {

    /**
     * 브라우저 캐시 허용 시간. 파일 내용은 불변(재업로드는 새 UUID)이라 길게 둬도 안전하지만,
     * 소유권이 바뀌는 일(탈퇴 등)에 대비해 짧게 둔다.
     */
    private static final Duration CACHE_MAX_AGE = Duration.ofMinutes(10);

    private final ScanImageService scanImageService;

    @Operation(
            summary = "촬영 원본 이미지 파일",
            description = "본인 세션의 이미지만 조회할 수 있습니다. S3 저장소면 presigned URL 로 302 리다이렉트하고, "
                    + "로컬 저장소면 이미지 바이트를 그대로 반환합니다."
    )
    @GetMapping("/{scanImageId}/file")
    public ResponseEntity<?> getOriginal(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long scanImageId
    ) {
        return toResponse(scanImageService.getImageFile(
                userDetails.getUserId(), scanImageId, ScanImageFile.Kind.ORIGINAL));
    }

    @Operation(
            summary = "분석 오버레이 이미지 파일",
            description = "FastAPI 가 원본 위에 병변을 그린 PNG. 백색광 이미지는 치석, UV 이미지는 치태 오버레이입니다. "
                    + "아직 분석 전이거나 오버레이를 받지 못한 이미지는 404(AI4006)를 반환합니다."
    )
    @GetMapping("/{scanImageId}/overlay")
    public ResponseEntity<?> getOverlay(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long scanImageId
    ) {
        return toResponse(scanImageService.getImageFile(
                userDetails.getUserId(), scanImageId, ScanImageFile.Kind.OVERLAY));
    }

    private ResponseEntity<?> toResponse(ScanImageFile file) {
        if (file.isRedirect()) {
            // presigned URL 은 만료되므로 리다이렉트 응답 자체는 캐시하지 않는다.
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(file.redirectUri())
                    .cacheControl(CacheControl.noStore())
                    .build();
        }

        return ResponseEntity.ok()
                .contentType(file.contentType())
                .cacheControl(CacheControl.maxAge(CACHE_MAX_AGE).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.filename()).build().toString())
                .body(file.resource());
    }
}
