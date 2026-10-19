package com.habitooth.backend.domain.ai.entity;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "detection_result")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetectionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detection_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_id", nullable = false)
    private ScanImage scanImage;

    @Column(name = "tooth_number", nullable = false)
    private Integer toothNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesion_type", nullable = false)
    private LesionType lesionType;

    @Column(name = "confidence", nullable = false)
    private Double confidence;

    @Column(name = "bbox", columnDefinition = "JSON", nullable = false)
    private String bbox;

    @Column(name = "area_ratio", nullable = false)
    private Double areaRatio;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}