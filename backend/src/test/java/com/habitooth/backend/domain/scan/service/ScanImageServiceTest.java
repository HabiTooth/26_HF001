package com.habitooth.backend.domain.scan.service;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.dto.response.ScanImageFile;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.storage.ImageStorage;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScanImageService - 이미지 파일 조회 (원본/오버레이, 리다이렉트/스트리밍)")
class ScanImageServiceTest {

    private static final long OWNER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long IMAGE_ID = 301L;
    private static final String IMAGE_URL = "/uploads/scan/10/LOWER_FRONT_WHITE_a.jpg";
    private static final String OVERLAY_URL = "/uploads/scan/10/overlay/LOWER_FRONT_WHITE_overlay_b.png";

    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private ScanImageRepository scanImageRepository;
    @Mock
    private ImageStorage imageStorage;

    @InjectMocks
    private ScanImageService scanImageService;

    private ScanImage image;

    @BeforeEach
    void setUp() {
        ScanSession session = ScanSession.create(OWNER_ID, 99L);
        image = ScanImage.builder()
                .scanSession(session)
                .viewType(ViewType.LOWER_FRONT)
                .lightType(LightType.WHITE_LIGHT)
                .imageUrl(IMAGE_URL)
                .build();
        image.setId(IMAGE_ID);
    }

    @Nested
    @DisplayName("getImageFile")
    class GetImageFile {

        @Test
        @DisplayName("로컬 저장소(presigned 없음) → 바이트·콘텐츠 타입·파일명을 담아 스트리밍")
        void streamsWhenNoPresignedUri() {
            when(scanImageRepository.findById(IMAGE_ID)).thenReturn(Optional.of(image));
            when(imageStorage.presignedUri(eq(IMAGE_URL), any(Duration.class))).thenReturn(Optional.empty());
            when(imageStorage.loadAsResource(IMAGE_URL)).thenReturn(new ByteArrayResource(new byte[]{1, 2}));
            when(imageStorage.getFilename(IMAGE_URL)).thenReturn("LOWER_FRONT_WHITE_a.jpg");

            ScanImageFile file = scanImageService.getImageFile(OWNER_ID, IMAGE_ID, ScanImageFile.Kind.ORIGINAL);

            assertThat(file.isRedirect()).isFalse();
            assertThat(file.contentType()).isEqualTo(MediaType.IMAGE_JPEG);
            assertThat(file.filename()).isEqualTo("LOWER_FRONT_WHITE_a.jpg");
            assertThat(file.resource()).isNotNull();
        }

        @Test
        @DisplayName("S3 저장소(presigned 있음) → 리다이렉트 URI 만 담고 바이트는 읽지 않는다")
        void redirectsWhenPresignedUriAvailable() {
            URI presigned = URI.create("https://bucket.s3.amazonaws.com/scan/10/a.jpg?X-Amz-Signature=x");
            when(scanImageRepository.findById(IMAGE_ID)).thenReturn(Optional.of(image));
            when(imageStorage.presignedUri(eq(IMAGE_URL), any(Duration.class))).thenReturn(Optional.of(presigned));

            ScanImageFile file = scanImageService.getImageFile(OWNER_ID, IMAGE_ID, ScanImageFile.Kind.ORIGINAL);

            assertThat(file.isRedirect()).isTrue();
            assertThat(file.redirectUri()).isEqualTo(presigned);
            verify(imageStorage, never()).loadAsResource(any());
        }

        @Test
        @DisplayName("오버레이가 있으면 오버레이 경로로 조회한다 (PNG)")
        void servesOverlayWhenPresent() {
            image.setOverlayImageUrl(OVERLAY_URL);
            when(scanImageRepository.findById(IMAGE_ID)).thenReturn(Optional.of(image));
            when(imageStorage.presignedUri(eq(OVERLAY_URL), any(Duration.class))).thenReturn(Optional.empty());
            when(imageStorage.loadAsResource(OVERLAY_URL)).thenReturn(new ByteArrayResource(new byte[]{3}));
            when(imageStorage.getFilename(OVERLAY_URL)).thenReturn("LOWER_FRONT_WHITE_overlay_b.png");

            ScanImageFile file = scanImageService.getImageFile(OWNER_ID, IMAGE_ID, ScanImageFile.Kind.OVERLAY);

            assertThat(file.contentType()).isEqualTo(MediaType.IMAGE_PNG);
            assertThat(file.filename()).endsWith(".png");
        }

        @Test
        @DisplayName("오버레이가 아직 없으면 404(SCAN_IMAGE_OVERLAY_NOT_FOUND), 저장소는 건드리지 않는다")
        void overlayMissing() {
            when(scanImageRepository.findById(IMAGE_ID)).thenReturn(Optional.of(image));

            assertThatThrownBy(() -> scanImageService.getImageFile(OWNER_ID, IMAGE_ID, ScanImageFile.Kind.OVERLAY))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_OVERLAY_NOT_FOUND);

            verify(imageStorage, never()).presignedUri(any(), any());
            verify(imageStorage, never()).loadAsResource(any());
        }

        @Test
        @DisplayName("다른 사용자의 이미지는 FORBIDDEN")
        void rejectsOtherUser() {
            when(scanImageRepository.findById(IMAGE_ID)).thenReturn(Optional.of(image));

            assertThatThrownBy(() -> scanImageService.getImageFile(OTHER_USER_ID, IMAGE_ID, ScanImageFile.Kind.ORIGINAL))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode").isEqualTo(ErrorCode.FORBIDDEN);
        }
    }

    @Test
    @DisplayName("deleteFile 은 저장소 delete 로 위임하고, null URL(오버레이 없음)은 무시한다")
    void deleteFile_delegatesAndIgnoresNull() {
        scanImageService.deleteFile(IMAGE_URL);
        scanImageService.deleteFile(null);

        verify(imageStorage).delete(IMAGE_URL);
        verify(imageStorage, never()).delete(null);
    }
}
