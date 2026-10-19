package com.habitooth.backend.domain.scan.storage;

import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.ScanHandler;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;


public interface ImageStorage {

    String URL_PREFIX = "/uploads/";

    /** 저장 파일명을 UUID 로만 만든다. 식별용 접두사가 필요하면 3-인자 버전을 쓸 것. */
    default String store(MultipartFile file, String directory) {
        return store(file, directory, null);
    }

    /**
     * 업로드된 원본을 저장한다.
     *
     * @param filenamePrefix 저장 파일명 앞에 붙일 식별자(예: {@code "LOWER_FRONT_UV"}).
     *                       null/빈 값이면 UUID 만 쓴다. 파일명 유일성은 여전히 UUID 가 보장한다.
     * @return 상대 URL ({@code /uploads/<directory>/<file>})
     */
    String store(MultipartFile file, String directory, String filenamePrefix);

    /**
     * 서버가 만든 파생 이미지(예: FastAPI 가 그린 결과 오버레이 PNG)를 바이트로 저장한다.
     *
     * @param extension 확장자. 점 포함(예: {@code ".png"})
     * @return 원본과 같은 형식의 상대 URL
     */
    String store(byte[] content, String contentType, String extension, String directory, String filenamePrefix);

    /** 파일 내용을 읽는다. 없으면 {@code SCAN_IMAGE_FILE_NOT_FOUND}. FastAPI 전송·직접 스트리밍에 쓴다. */
    Resource loadAsResource(String imageUrl);

    String getFilename(String imageUrl);

    /** 파일을 지운다. 이미 없으면 조용히 넘어간다. */
    void delete(String imageUrl);

    /**
     * 클라이언트가 저장소에서 직접 받을 수 있는 임시 URL(S3 presigned URL).
     */
    default Optional<URI> presignedUri(String imageUrl, Duration ttl) {
        return Optional.empty();
    }

    /** 업로드 파일 공통 검증. 비어 있거나 image/* 가 아니면 거부한다. */
    static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ScanHandler(ErrorCode.EMPTY_IMAGE_FILE);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ScanHandler(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    /** 확장자로 추정한 응답 콘텐츠 타입. 모르는 확장자는 octet-stream. */
    static MediaType contentTypeOf(String imageUrl) {
        if (imageUrl == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        String lower = imageUrl.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        if (lower.endsWith(".heic")) {
            return MediaType.parseMediaType("image/heic");
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
