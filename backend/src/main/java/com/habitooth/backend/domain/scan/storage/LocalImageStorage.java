package com.habitooth.backend.domain.scan.storage;

import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * 로컬 디스크에 이미지를 저장한다. {@code file.storage} 가 없거나 {@code local} 일 때 쓰인다(dev 기본).
 * <p>
 * 저장과 조회는 모두 {@link #rootDir} 하나를 기준으로 경로를 만든다.
 * DB 에는 환경과 무관한 상대 URL({@code /uploads/<directory>/<file>})만 기록하므로,
 * {@code file.upload-dir} 설정이 바뀌어도 기존 레코드가 그대로 유효하다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "file.storage", havingValue = "local", matchIfMissing = true)
public class LocalImageStorage implements ImageStorage {

    /** 업로드 루트 절대경로. 상대경로 설정(dev 의 {@code uploads})은 작업 디렉터리 기준으로 풀린다. */
    private final Path rootDir;

    public LocalImageStorage(@Value("${file.upload-dir}") String uploadDir) {
        this.rootDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        log.info("이미지 저장소: 로컬 디스크, 루트 디렉터리 {}", rootDir);
    }


    @Override
    public String store(MultipartFile file, String directory, String filenamePrefix) {
        ImageStorage.validate(file);

        try (InputStream inputStream = file.getInputStream()) {
            return write(inputStream, directory, filenamePrefix, extractExtension(file.getOriginalFilename()));
        } catch (IOException e) {
            log.error("이미지 저장 실패 (rootDir={})", rootDir, e);
            throw new ScanHandler(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    @Override
    public String store(byte[] content, String contentType, String extension, String directory, String filenamePrefix) {
        if (content == null || content.length == 0) {
            throw new ScanHandler(ErrorCode.EMPTY_IMAGE_FILE);
        }

        try (InputStream inputStream = new ByteArrayInputStream(content)) {
            return write(inputStream, directory, filenamePrefix, extension == null ? "" : extension);
        } catch (IOException e) {
            log.error("파생 이미지 저장 실패 (rootDir={})", rootDir, e);
            throw new ScanHandler(ErrorCode.FILE_SAVE_FAILED);
        }
    }

    /** 공통 쓰기. 접두사는 사람이 읽기 위한 것이고 유일성은 UUID 가 책임진다(재업로드해도 덮어쓰지 않음). */
    private String write(InputStream inputStream, String directory, String filenamePrefix, String extension)
            throws IOException {
        Path uploadPath = rootDir.resolve(directory).normalize();
        if (!uploadPath.startsWith(rootDir)) {
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_INVALID);
        }
        Files.createDirectories(uploadPath);

        String storedFilename = sanitizePrefix(filenamePrefix) + UUID.randomUUID() + extension;
        Path targetPath = uploadPath.resolve(storedFilename).normalize();
        Files.copy(inputStream, targetPath);

        return URL_PREFIX + directory + "/" + storedFilename;
    }


    @Override
    public Resource loadAsResource(String imageUrl) {
        Path filePath = resolveFilePath(imageUrl);

        try {
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                log.error("촬영 이미지 파일 없음: imageUrl={}, path={}", imageUrl, filePath);
                throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_FOUND);
            }

            if (!resource.isReadable()) {
                log.error("촬영 이미지 파일 읽기 불가: imageUrl={}, path={}", imageUrl, filePath);
                throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_READABLE);
            }

            return resource;

        } catch (MalformedURLException e) {
            log.error("이미지 로드 실패: imageUrl={}, path={}", imageUrl, filePath, e);
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_INVALID);
        }
    }

    @Override
    public String getFilename(String imageUrl) {
        return resolveFilePath(imageUrl).getFileName().toString();
    }

    @Override
    public void delete(String imageUrl) {
        Path filePath = resolveFilePath(imageUrl);
        try {
            if (Files.deleteIfExists(filePath)) {
                log.info("이미지 파일 삭제: {}", filePath);
            }
        } catch (IOException e) {
            log.error("이미지 파일 삭제 실패: imageUrl={}, path={}", imageUrl, filePath, e);
            throw new ScanHandler(ErrorCode.FILE_SAVE_FAILED);
        }
    }

    /**
     * DB 에 저장된 URL 을 실제 파일의 절대경로로 바꾼다.
     * 결과가 {@link #rootDir} 바깥을 가리키면 경로 조작으로 보고 거부한다.
     */
    private Path resolveFilePath(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_EMPTY);
        }

        String relativePath = imageUrl.trim().replaceFirst("^/?uploads/", "");
        Path filePath = rootDir.resolve(relativePath).normalize();

        if (!filePath.startsWith(rootDir)) {
            log.error("업로드 루트 바깥 경로 접근 시도: imageUrl={}, path={}", imageUrl, filePath);
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_INVALID);
        }

        return filePath;
    }

    /**
     * 파일명에 들어가도 안전한 문자만 남기고 뒤에 구분자 {@code _} 를 붙인다.
     * 경로 조작({@code ../})이나 OS 별 금칙문자가 접두사를 통해 들어오지 못하게 막는다.
     */
    static String sanitizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "";
        }

        String sanitized = prefix.trim().replaceAll("[^A-Za-z0-9_-]", "");
        return sanitized.isEmpty() ? "" : sanitized + "_";
    }

    static String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }

        return filename.substring(filename.lastIndexOf("."));
    }
}
