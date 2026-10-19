package com.habitooth.backend.domain.scan.entity;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "scan_image",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_scan_image_session_view_light",
                columnNames = {"session_id", "view_type", "light_type"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor
public class ScanImage {

    /**
     * 해상도를 알 수 없을 때 쓰는 기본값.
     *
     * <p>병변 polygon 을 0~1 로 정규화할 때 분모가 되는 값이라, 실제 촬영 해상도를
     * 못 읽었을 때 어떤 값을 가정하느냐가 좌표에 그대로 영향을 준다. 저장 시점 폴백
     * (ImageIO 파싱 실패)과 분석 시점 폴백(크기 미저장 행)이 서로 다른 값을 쓰면
     * 같은 이미지가 경로에 따라 다른 좌표로 정규화되므로 여기 한 곳에서만 정의한다.
     */
    public static final int DEFAULT_WIDTH = 640;
    public static final int DEFAULT_HEIGHT = 480;

     @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ScanSession scanSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "light_type", nullable = false)
    private LightType lightType;

    @Enumerated(EnumType.STRING)
    @Column(name = "view_type", nullable = false)
    private ViewType viewType;

    @Column(name = "s3_url", nullable = false, length = 1000)
    private String imageUrl;

    /**
     * 분석 결과 오버레이(PNG) 저장 경로
     */
    @Column(name = "overlay_image_url", length = 1000)
    private String overlayImageUrl;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @CreatedDate
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    @Builder
    private ScanImage(
            ScanSession scanSession,
            LightType lightType,
            ViewType viewType,
            String imageUrl,
            LocalDateTime capturedAt
    ) {
        this.scanSession = scanSession;
        this.lightType = lightType;
        this.viewType = viewType;
        this.imageUrl = imageUrl;
        this.capturedAt = capturedAt;
    }


    public static ScanImage create(
            ScanSession scanSession,
            LightType lightType,
            ViewType viewType,
            String imageUrl
    ) {
        return ScanImage.builder()
                .scanSession(scanSession)
                .lightType(lightType)
                .viewType(viewType)
                .imageUrl(imageUrl)
                .capturedAt(LocalDateTime.now())
                .build();
    }
}
