package com.habitooth.backend.domain.ai.entity;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AnalysisDetectedIssue extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_detected_issue_id")
    private Long id;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_result_id", nullable = false)
    private AnalysisResult analysisResult;

    private Integer toothNumber;

    @Column(length = 100)
    private String templateRegionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LesionType lesionType;

    /**
     * 모델 검출 신뢰도(0~1). UV 형광 치태 영역은 색 기반 판정이라 신뢰도 개념이 없어 null 이다.
     * 가짜 값(0.0/1.0)을 채우면 "모델이 낮은 확신도로 잡은 병변"과 구분할 수 없어진다.
     */
    private Double confidence;

    // @Enumerated(EnumType.STRING)
    // @Column(nullable = false, length = 30)
    // private RiskLevel riskLevel;

    /**
     * 병변 polygon JSON ({@code [{"x":u,"y":v}, ...]}).
     * 좌표는 사진 기준이 아니라 <b>이 사진에서 검출된 해당 치아(toothNumber)의 bbox 기준 0~1</b> 이다
     * (x=u, y=v, 원점은 사진에서 보이는 치아 bbox 의 왼쪽 위, 좌우 반전 미적용).
     * 치아에 매핑되지 않은 병변은 {@code []}.
     */
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String polygonJson;
}