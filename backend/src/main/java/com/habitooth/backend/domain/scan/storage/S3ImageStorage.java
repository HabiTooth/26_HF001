package com.habitooth.backend.domain.scan.storage;

import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * S3 에 이미지를 저장한다. {@code file.storage=s3} 일 때만 빈으로 뜬다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "file.storage", havingValue = "s3")
public class S3ImageStorage implements ImageStorage {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final String keyPrefix;

    public S3ImageStorage(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${file.s3.bucket}") String bucket,
            @Value("${file.s3.key-prefix:}") String keyPrefix
    ) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("file.storage=s3 이면 file.s3.bucket 이 필요합니다.");
        }
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.keyPrefix = normalizePrefix(keyPrefix);
        log.info("이미지 저장소: S3 bucket={}, keyPrefix='{}'", bucket, this.keyPrefix);
    }

    @Override
    public String store(MultipartFile file, String directory, String filenamePrefix) {
        ImageStorage.validate(file);

        String imageUrl = newImageUrl(directory, filenamePrefix,
                LocalImageStorage.extractExtension(file.getOriginalFilename()));
        try (InputStream inputStream = file.getInputStream()) {
            put(imageUrl, file.getContentType(), RequestBody.fromInputStream(inputStream, file.getSize()));
        } catch (IOException | SdkException e) {
            log.error("S3 이미지 업로드 실패. bucket={}, key={}", bucket, keyOf(imageUrl), e);
            throw new ScanHandler(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
        return imageUrl;
    }

    @Override
    public String store(byte[] content, String contentType, String extension, String directory, String filenamePrefix) {
        if (content == null || content.length == 0) {
            throw new ScanHandler(ErrorCode.EMPTY_IMAGE_FILE);
        }

        String imageUrl = newImageUrl(directory, filenamePrefix, extension == null ? "" : extension);
        try {
            put(imageUrl, contentType, RequestBody.fromBytes(content));
        } catch (SdkException e) {
            log.error("S3 파생 이미지 업로드 실패. bucket={}, key={}", bucket, keyOf(imageUrl), e);
            throw new ScanHandler(ErrorCode.FILE_SAVE_FAILED);
        }
        return imageUrl;
    }

    private void put(String imageUrl, String contentType, RequestBody body) {
        PutObjectRequest.Builder request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(keyOf(imageUrl));
        if (contentType != null && !contentType.isBlank()) {
            request.contentType(contentType);
        }
        s3Client.putObject(request.build(), body);
    }

    /**
     * 객체 전체를 메모리로 읽어 돌려준다. 촬영 이미지는 업로드 제한(10MB) 이하이고, FastAPI 전송과
     * 응답 스트리밍 양쪽에서 재사용 가능한 Resource 가 필요해 InputStreamResource 대신 바이트로 받는다.
     */
    @Override
    public Resource loadAsResource(String imageUrl) {
        String key = keyOf(imageUrl);
        try {
            ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(key).build());
            return new NamedByteArrayResource(bytes.asByteArray(), filenameOf(key));
        } catch (NoSuchKeyException e) {
            log.error("S3 객체 없음. bucket={}, key={}", bucket, key);
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_FOUND);
        } catch (SdkException e) {
            log.error("S3 객체 읽기 실패. bucket={}, key={}", bucket, key, e);
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_READABLE);
        }
    }

    @Override
    public String getFilename(String imageUrl) {
        return filenameOf(keyOf(imageUrl));
    }

    @Override
    public void delete(String imageUrl) {
        String key = keyOf(imageUrl);
        try {
            // S3 DeleteObject 는 없는 키에도 204 를 주므로 "이미 없음" 을 따로 다룰 필요가 없다.
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            log.info("S3 객체 삭제: bucket={}, key={}", bucket, key);
        } catch (SdkException e) {
            log.error("S3 객체 삭제 실패. bucket={}, key={}", bucket, key, e);
            throw new ScanHandler(ErrorCode.FILE_SAVE_FAILED);
        }
    }

    @Override
    public Optional<URI> presignedUri(String imageUrl, Duration ttl) {
        GetObjectRequest getObject = GetObjectRequest.builder()
                .bucket(bucket)
                .key(keyOf(imageUrl))
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(getObject)
                .build();
        try {
            return Optional.of(s3Presigner.presignGetObject(presignRequest).url().toURI());
        } catch (Exception e) {
            // presign 은 로컬 서명이라 거의 실패하지 않지만, 실패해도 서버 스트리밍으로 대체할 수 있게 empty.
            log.warn("S3 presigned URL 생성 실패 → 서버 스트리밍으로 대체. key={}", keyOf(imageUrl), e);
            return Optional.empty();
        }
    }

    // ------------------------------------------------------------------
    // 키 매핑
    // ------------------------------------------------------------------

    private String newImageUrl(String directory, String filenamePrefix, String extension) {
        String dir = directory == null ? "" : directory.replaceAll("^/+|/+$", "");
        if (dir.isEmpty() || dir.contains("..")) {
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_INVALID);
        }
        String storedFilename = LocalImageStorage.sanitizePrefix(filenamePrefix) + UUID.randomUUID() + extension;
        return URL_PREFIX + dir + "/" + storedFilename;
    }

    /** {@code /uploads/scan/12/x.jpg} → {@code <keyPrefix>scan/12/x.jpg}. 경로 조작({@code ..})은 거부. */
    String keyOf(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_EMPTY);
        }
        String relative = imageUrl.trim().replaceFirst("^/?uploads/", "").replaceAll("^/+", "");
        if (relative.isEmpty() || relative.contains("..")) {
            log.error("잘못된 이미지 URL: {}", imageUrl);
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_INVALID);
        }
        return keyPrefix + relative;
    }

    private static String filenameOf(String key) {
        int slash = key.lastIndexOf('/');
        return slash < 0 ? key : key.substring(slash + 1);
    }

    /** {@code "habitooth"} / {@code "/habitooth/"} → {@code "habitooth/"}, 빈 값 → {@code ""}. */
    private static String normalizePrefix(String prefix) {
        if (prefix == null) {
            return "";
        }
        String trimmed = prefix.trim().replaceAll("^/+|/+$", "");
        return trimmed.isEmpty() ? "" : trimmed + "/";
    }

    /** 파일명을 기억하는 ByteArrayResource. 멀티파트 전송과 Content-Disposition 에 쓴다. */
    static final class NamedByteArrayResource extends ByteArrayResource {
        private final String filename;

        NamedByteArrayResource(byte[] bytes, String filename) {
            super(bytes);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
