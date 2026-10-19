package com.habitooth.backend.domain.scan.service;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.converter.ScanConverter;
import com.habitooth.backend.domain.scan.dto.request.ScanImageUploadRequest;
import com.habitooth.backend.domain.scan.dto.request.ScanImageUploadRequestForSession;
import com.habitooth.backend.domain.scan.dto.response.ScanImageFile;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUploadResponse;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.storage.ImageStorage;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ScanImageService {
    private static final Logger log = LoggerFactory.getLogger(ScanImageService.class);
    private final ScanSessionRepository scanSessionRepository;
    private final ScanImageRepository scanImageRepository;
    private final ImageStorage imageStorage;

    /** presigned URL 유효 시간(초). S3 저장소에서만 의미가 있다. */
    @Value("${file.s3.presign-ttl-seconds:300}")
    private long presignTtlSeconds = 300;

    @Transactional
    public ScanImageUploadResponse uploadImage(
            ScanImageUploadRequest request,
            MultipartFile file
    ){
        ScanSession scanSession = ScanConverter.toScanSession(request);
        ScanSession savedSession = scanSessionRepository.save(scanSession);

        String directory = "scan/" + savedSession.getId();
        String imageUrl = imageStorage.store(
                file,
                directory,
                imageFilenamePrefix(request.getRegion(), request.getImageType())
        );

        ScanImage scanImage = ScanConverter.toScanImage(
                savedSession,
                request,
                imageUrl
        );

        try (InputStream is = file.getInputStream()) {
            BufferedImage bufferedImage = ImageIO.read(is);

            if (bufferedImage != null) {
                int width = bufferedImage.getWidth();
                int height = bufferedImage.getHeight();
                scanImage.setWidth(width);
                scanImage.setHeight(height);
                log.info("[IMAGE_METADATA] 가로: {}, 세로: {} 정밀 확보 성공", width, height);
            } else {
                // 이미지 스트림이 오염되었거나 미지원 포맷일 때 기본 해상도로 Fallback 처리
                log.warn("[IMAGE_WARN] ImageIO 파싱 실패(Null). 기본 해상도({}x{})로 대체합니다. 파일명: {}",
                        ScanImage.DEFAULT_WIDTH, ScanImage.DEFAULT_HEIGHT, file.getOriginalFilename());
                scanImage.setWidth(ScanImage.DEFAULT_WIDTH);
                scanImage.setHeight(ScanImage.DEFAULT_HEIGHT);
            }
        } catch (IOException e) {
            log.error("이미지 스트림 리딩 중 IO 장애 발생: {}", e.getMessage());
            // 크기를 못 읽더라도 비즈니스 릴리즈를 위해 기본값을 세팅하고 진행하거나 custom 예외 처리
            scanImage.setWidth(ScanImage.DEFAULT_WIDTH);
            scanImage.setHeight(ScanImage.DEFAULT_HEIGHT);
        }
        ScanImage savedImage = scanImageRepository.save(scanImage);

        return ScanConverter.toScanImageUploadResponseDTO(savedImage);
    }

    @Transactional
    public ScanImage uploadFileToExistingSession(
            Long sessionId,
            ScanImageUploadRequestForSession request,
            MultipartFile file
    ){
        // 1. 세션 조회
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        log.debug("Uploading image to session {}", session);

        // 2. 파일 저장
        String directory = "scan/" + session.getId();
        String imageUrl = imageStorage.store(
                file,
                directory,
                imageFilenamePrefix(request.getViewType(), request.getLightType())
        );

        // 3. ScanImage 엔티티 생성
        ScanImage scanImage = ScanImage.create(
                session,
                request.getLightType(),
                request.getViewType(),
                imageUrl
        );

        try (InputStream is = file.getInputStream()) {
            BufferedImage bufferedImage = ImageIO.read(is);

            if (bufferedImage != null) {
                int width = bufferedImage.getWidth();
                int height = bufferedImage.getHeight();
                scanImage.setWidth(width);
                scanImage.setHeight(height);
                log.info("[IMAGE_METADATA] 가로: {}, 세로: {} 정밀 확보 성공", width, height);
            } else {
                // 이미지 스트림이 오염되었거나 미지원 포맷일 때 기본 해상도로 Fallback 처리
                log.warn("[IMAGE_WARN] ImageIO 파싱 실패(Null). 기본 해상도({}x{})로 대체합니다. 파일명: {}",
                        ScanImage.DEFAULT_WIDTH, ScanImage.DEFAULT_HEIGHT, file.getOriginalFilename());
                scanImage.setWidth(ScanImage.DEFAULT_WIDTH);
                scanImage.setHeight(ScanImage.DEFAULT_HEIGHT);
            }
        } catch (IOException e) {
            log.error("이미지 스트림 리딩 중 IO 장애 발생: {}", e.getMessage());
            // 크기를 못 읽더라도 비즈니스 릴리즈를 위해 기본값을 세팅하고 진행하거나 custom 예외 처리
            scanImage.setWidth(ScanImage.DEFAULT_WIDTH);
            scanImage.setHeight(ScanImage.DEFAULT_HEIGHT);
        }

        // 4. DB 저장
        return scanImageRepository.save(scanImage);
    }

    /**
     * 저장 파일명 접두사 — {@code LOWER_FRONT_UV_<uuid>.jpg} 형태가 되게 한다.
     *
     * <p>예전엔 UUID 뿐이라 업로드 디렉터리를 열어봐도, FastAPI 로그(멀티파트 filename 이
     * 이 이름 그대로 넘어간다)를 봐도 어느 구역을 어느 광원으로 찍은 사진인지 알 수 없었다.
     * 한 구역을 백색광·UV 두 장 찍기 시작하면서 특히 구분이 필요해졌다.
     */
    private String imageFilenamePrefix(ViewType viewType, LightType lightType) {
        String zone = viewType == null ? "UNKNOWN" : viewType.name();
        String light = lightType == null
                ? "UNKNOWN"
                : (lightType == LightType.UV_LIGHT ? "UV" : "WHITE");

        return zone + "_" + light;
    }

    public ScanImage createImage(Long sessionId, ScanImageUploadRequestForSession request) {
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        ScanImage image = ScanImage.create(
                session,
                request.getLightType(),
                request.getViewType(),
                request.getImageUrl()
        );

        return scanImageRepository.save(image);
    }

    @Transactional(readOnly = true)
    public ScanImage getScanImage(Long userId, Long scanImageId) {
        ScanImage scanImage = scanImageRepository.findById(scanImageId)
                .orElseThrow(() -> new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_NOT_FOUND));

        if (!scanImage.getScanSession().getUserId().equals(userId)) {

            throw new AiAnalysisHandler(ErrorCode.FORBIDDEN);
        }
        return scanImage;
    }

    @Transactional(readOnly = true)
    public Resource getImageResource(Long userId, Long scanImageId) {
        ScanImage scanImage = getScanImage(userId, scanImageId);
        Resource resource = imageStorage.loadAsResource(scanImage.getImageUrl());



        if(!resource.exists()){
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_FOUND);
        }

        if(!resource.isReadable()){
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_READABLE);
        }

        return resource;
    }

    @Transactional(readOnly = true)
    public String getImageFilename(Long userId, Long scanImageId) {
        ScanImage scanImage = getScanImage(userId, scanImageId);
        return imageStorage.getFilename(scanImage.getImageUrl());
    }

    /** 저장소에서 파일을 지운다. 로컬/S3 모두 {@link ImageStorage#delete} 로 위임한다. 실패는 로그만 남긴다. */
    public void deleteFile(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }
        try {
            imageStorage.delete(imageUrl);
        } catch (Exception e) {
            log.error("Failed to delete file: {}", imageUrl, e);
        }
    }

    /**
     * 원본/오버레이 파일 조회*/
    @Transactional(readOnly = true)
    public ScanImageFile getImageFile(Long userId, Long scanImageId, ScanImageFile.Kind kind) {
        ScanImage scanImage = getScanImage(userId, scanImageId);

        String imageUrl = kind == ScanImageFile.Kind.OVERLAY
                ? scanImage.getOverlayImageUrl()
                : scanImage.getImageUrl();
        if (imageUrl == null || imageUrl.isBlank()) {
            throw kind == ScanImageFile.Kind.OVERLAY
                    ? new ScanHandler(ErrorCode.SCAN_IMAGE_OVERLAY_NOT_FOUND)
                    : new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_URL_EMPTY);
        }

        Optional<URI> presigned = imageStorage.presignedUri(imageUrl, Duration.ofSeconds(presignTtlSeconds));
        if (presigned.isPresent()) {
            return ScanImageFile.redirect(presigned.get());
        }

        Resource resource = imageStorage.loadAsResource(imageUrl);
        return ScanImageFile.stream(resource, ImageStorage.contentTypeOf(imageUrl), imageStorage.getFilename(imageUrl));
    }
}