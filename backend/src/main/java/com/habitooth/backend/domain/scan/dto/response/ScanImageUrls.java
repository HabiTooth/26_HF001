package com.habitooth.backend.domain.scan.dto.response;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * 프론트에 내려줄 이미지 파일 API 경로
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ScanImageUrls {

    public static final String BASE_PATH = "/api/scan-images";

    /** 원본 사진 */
    public static String fileUrl(Long scanImageId) {
        return BASE_PATH + "/" + scanImageId + "/file";
    }

    /** 분석 오버레이 PNG. 오버레이가 없는 이미지는 호출 쪽에서 null 로 내려준다. */
    public static String overlayUrl(Long scanImageId) {
        return BASE_PATH + "/" + scanImageId + "/overlay";
    }
}
