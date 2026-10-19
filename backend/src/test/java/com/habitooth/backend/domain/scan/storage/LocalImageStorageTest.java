package com.habitooth.backend.domain.scan.storage;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LocalImageStorage - 바이트 저장/삭제/경로 매핑")
class LocalImageStorageTest {

    @TempDir
    Path tempDir;

    private LocalImageStorage storage;

    @BeforeEach
    void setUp() {
        storage = new LocalImageStorage(tempDir.toString());
    }

    @Test
    @DisplayName("바이트 저장 → /uploads/<dir>/<prefix>_<uuid>.png 형식의 상대 URL, 파일은 루트 아래에 생긴다")
    void storeBytes_writesUnderRootAndReturnsRelativeUrl() throws IOException {
        byte[] png = "png-bytes".getBytes(StandardCharsets.UTF_8);

        String url = storage.store(png, "image/png", ".png", "scan/1/overlay", "LOWER_FRONT_WHITE_overlay");

        assertThat(url).startsWith("/uploads/scan/1/overlay/LOWER_FRONT_WHITE_overlay_").endsWith(".png");
        Path stored = tempDir.resolve(url.substring("/uploads/".length()));
        assertThat(Files.readAllBytes(stored)).isEqualTo(png);

        Resource resource = storage.loadAsResource(url);
        assertThat(resource.getContentAsByteArray()).isEqualTo(png);
        assertThat(storage.getFilename(url)).isEqualTo(stored.getFileName().toString());
        assertThat(ImageStorage.contentTypeOf(url)).isEqualTo(MediaType.IMAGE_PNG);
    }

    @Test
    @DisplayName("delete 는 파일을 지우고, 이미 없는 파일은 조용히 넘어간다")
    void delete_removesFileAndIgnoresMissing() {
        String url = storage.store(new byte[]{1, 2, 3}, "image/png", ".png", "scan/1/overlay", null);
        Path stored = tempDir.resolve(url.substring("/uploads/".length()));
        assertThat(stored).exists();

        storage.delete(url);
        assertThat(stored).doesNotExist();

        assertThatCode(() -> storage.delete(url)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("로컬 저장소는 presigned URL 이 없다 → 서버 스트리밍으로 처리")
    void presignedUri_isEmpty() {
        assertThat(storage.presignedUri("/uploads/scan/1/a.jpg", java.time.Duration.ofMinutes(5))).isEmpty();
    }

    @Test
    @DisplayName("업로드 루트 바깥을 가리키는 URL 은 경로 조작으로 보고 거부한다")
    void rejectsPathTraversal() {
        assertThatThrownBy(() -> storage.loadAsResource("/uploads/../../etc/passwd"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_URL_INVALID);
        assertThatThrownBy(() -> storage.delete("/uploads/../outside.png"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SCAN_IMAGE_URL_INVALID);
    }

    @Test
    @DisplayName("빈 바이트는 저장하지 않는다")
    void rejectsEmptyBytes() {
        assertThatThrownBy(() -> storage.store(new byte[0], "image/png", ".png", "scan/1/overlay", null))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EMPTY_IMAGE_FILE);
    }
}
