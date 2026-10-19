package com.habitooth.backend.domain.scan.storage;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("S3ImageStorage - 상대 URL ↔ 객체 키 매핑, presigned URL")
class S3ImageStorageTest {

    @Mock
    private S3Client s3Client;
    @Mock
    private S3Presigner s3Presigner;

    private S3ImageStorage storage;

    @BeforeEach
    void setUp() {
        storage = new S3ImageStorage(s3Client, s3Presigner, "habitooth-images", "/habitooth/");
    }

    @Test
    @DisplayName("원본 업로드 → 키는 <prefix>/<dir>/<file>, DB 에는 로컬과 같은 /uploads/... 상대 URL")
    void storeMultipart_putsWithPrefixedKeyAndReturnsRelativeUrl() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        String url = storage.store(file, "scan/12", "LOWER_FRONT_WHITE");

        assertThat(url).startsWith("/uploads/scan/12/LOWER_FRONT_WHITE_").endsWith(".jpg");

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().bucket()).isEqualTo("habitooth-images");
        assertThat(request.getValue().key()).isEqualTo("habitooth/" + url.substring("/uploads/".length()));
        assertThat(request.getValue().contentType()).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("바이트 저장(오버레이 PNG) → contentType 과 확장자가 그대로 반영된다")
    void storeBytes_putsPng() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        String url = storage.store(new byte[]{9}, "image/png", ".png", "scan/12/overlay", "LOWER_FRONT_WHITE_overlay");

        assertThat(url).startsWith("/uploads/scan/12/overlay/LOWER_FRONT_WHITE_overlay_").endsWith(".png");
        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().contentType()).isEqualTo("image/png");
    }

    @Test
    @DisplayName("loadAsResource 는 객체 바이트와 파일명을 돌려준다 (FastAPI 멀티파트 전송에 재사용 가능)")
    void loadAsResource_returnsBytesWithFilename() throws Exception {
        byte[] bytes = {1, 2, 3, 4};
        when(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenReturn(ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), bytes));

        Resource resource = storage.loadAsResource("/uploads/scan/12/a.jpg");

        assertThat(resource.getContentAsByteArray()).isEqualTo(bytes);
        assertThat(resource.getFilename()).isEqualTo("a.jpg");
        assertThat(storage.getFilename("/uploads/scan/12/a.jpg")).isEqualTo("a.jpg");

        ArgumentCaptor<GetObjectRequest> request = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(s3Client).getObjectAsBytes(request.capture());
        assertThat(request.getValue().key()).isEqualTo("habitooth/scan/12/a.jpg");
    }

    @Test
    @DisplayName("객체가 없으면 로컬과 같은 SCAN_IMAGE_FILE_NOT_FOUND")
    void loadAsResource_missingKey() {
        when(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder().message("no key").build());

        assertThatThrownBy(() -> storage.loadAsResource("/uploads/scan/12/missing.jpg"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_FILE_NOT_FOUND);
    }

    @Test
    @DisplayName("presignedUri 는 요청 TTL 로 서명한 GET URL 을 돌려준다")
    void presignedUri_signsGetObject() throws Exception {
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(new URL("https://habitooth-images.s3.amazonaws.com/habitooth/scan/12/a.jpg?X-Amz-Signature=abc"));
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        Optional<URI> uri = storage.presignedUri("/uploads/scan/12/a.jpg", Duration.ofMinutes(5));

        assertThat(uri).isPresent();
        assertThat(uri.get().toString()).contains("X-Amz-Signature=abc");

        ArgumentCaptor<GetObjectPresignRequest> request = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(s3Presigner).presignGetObject(request.capture());
        assertThat(request.getValue().signatureDuration()).isEqualTo(Duration.ofMinutes(5));
        assertThat(request.getValue().getObjectRequest().key()).isEqualTo("habitooth/scan/12/a.jpg");
    }

    @Test
    @DisplayName("delete 는 같은 키의 객체를 지운다")
    void delete_removesObject() {
        when(s3Client.deleteObject(any(DeleteObjectRequest.class))).thenReturn(DeleteObjectResponse.builder().build());

        storage.delete("/uploads/scan/12/a.jpg");

        ArgumentCaptor<DeleteObjectRequest> request = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(request.capture());
        assertThat(request.getValue().key()).isEqualTo("habitooth/scan/12/a.jpg");
    }

    @Test
    @DisplayName("키 매핑: 접두사 없이도 동작하고, '..' 가 섞인 URL 은 거부한다")
    void keyMapping() {
        S3ImageStorage noPrefix = new S3ImageStorage(s3Client, s3Presigner, "bucket", "");
        assertThat(noPrefix.keyOf("/uploads/scan/1/a.jpg")).isEqualTo("scan/1/a.jpg");
        assertThat(noPrefix.keyOf("uploads/scan/1/a.jpg")).isEqualTo("scan/1/a.jpg");
        assertThat(storage.keyOf("/uploads/scan/1/a.jpg")).isEqualTo("habitooth/scan/1/a.jpg");

        assertThatThrownBy(() -> storage.keyOf("/uploads/../secret.jpg"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_URL_INVALID);
        assertThatThrownBy(() -> storage.keyOf(" "))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_URL_EMPTY);
    }
}
