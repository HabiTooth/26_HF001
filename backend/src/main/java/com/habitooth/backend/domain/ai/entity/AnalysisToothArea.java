package com.habitooth.backend.domain.ai.entity;

import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AnalysisToothArea extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_tooth_area_id")
    private Long id;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_result_id", nullable = false)
    private AnalysisResult analysisResult;

    private Integer areaId;

    /** FDI 번호(11~48). 미할당 치아는 저장하지 않는다. */
    private Integer toothNumber;

    /**
     * 검출 상태. FastAPI 2.3 부터 구역의 기대 치아 전부가 행으로 오며, 사진에 안 잡힌 치아는
     * NOT_DETECTED(areaRatio/toothScore/riskLevel null)다. 채점·치아 수 집계는 DETECTED 만 센다.
     * V22 이전 행은 전부 검출된 치아라 DEFAULT 'DETECTED' 로 채워졌다.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ToothDetectionStatus status = ToothDetectionStatus.DETECTED;

    @Column(length = 100)
    private String templateRegionId;

    /** 대표 병변 종류. 병변 없는 치아는 null (그래도 100점으로 저장된다) */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private LesionType lesionType;

    /** 치아 면적 대비 병변 면적 비율(%). 병변 없으면 0.0, 미검출(NOT_DETECTED/SKIPPED) 치아는 null */
    private Double areaRatio;

    /** 100 - DAMAGE_K × areaRatio. 미검출 치아는 null */
    private Double toothScore;

    /** 채점·집계 대상인지 (DETECTED). */
    public boolean isDetected() {
        return status == null || status == ToothDetectionStatus.DETECTED;
    }

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RiskLevel riskLevel;

}