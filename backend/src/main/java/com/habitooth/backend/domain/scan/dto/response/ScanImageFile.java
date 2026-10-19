package com.habitooth.backend.domain.scan.dto.response;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

import java.net.URI;

/**
 * 이미지 파일 조회 결과
 */
public record ScanImageFile(
        URI redirectUri,
        Resource resource,
        MediaType contentType,
        String filename
) {

    public static ScanImageFile redirect(URI uri) {
        return new ScanImageFile(uri, null, null, null);
    }

    public static ScanImageFile stream(Resource resource, MediaType contentType, String filename) {
        return new ScanImageFile(null, resource, contentType, filename);
    }

    public boolean isRedirect() {
        return redirectUri != null;
    }

    /** 원본/오버레이 구분 */
    public enum Kind {
        ORIGINAL,
        OVERLAY
    }
}
