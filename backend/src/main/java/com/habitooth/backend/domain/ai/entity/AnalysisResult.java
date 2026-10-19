package com.habitooth.backend.domain.ai.entity;

import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AnalysisResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_result_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_image_id", nullable = false)
    private ScanImage scanImage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisStatus analysisStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ViewType viewType;

    @Column(length = 100)
    private String aiTaskId;

    /** @deprecated v1 점수. 신규 쓰기 없음. 이력 조회용으로만 유지 후 2개 릴리스 뒤 제거 */
    @Deprecated
    private Integer totalScore;

    /** 구역 점수 = ({@code max(50, 100 - 병변개수×8 - totalCalculusRatio×0.5)})*/
    private Double zoneScore;

    /**
     * 구역 점수 유효 여부.
     *
     * 임시 판정: 현재는 "zoneScore 가 null 이 아니면 유효"로만 봄
     * 기존 계획이었던 "유효 치아 3개 미만이면 무효" 같은 실질적 신뢰도 판정은 아직 없음.
     * (dataConfidence 등 별도 지표 도입 필요).
     */
    private Boolean zoneValid;

    /** FDI 번호가 실제로 부여되어 채점에 포함된 치아 수 (번호 미부여 검출 제외) */
    private Integer detectedToothCount;

    /** 구역의 기대 치아 수(핵심 시퀀스 − 결손치). FastAPI 2.3 부터. 구버전 결과는 null */
    private Integer expectedToothCount;

    /** detectedToothCount / expectedToothCount. FastAPI 는 0.6 미만이면 구역을 무효로 본다 */
    private Double coverageRatio;

    /** 점수 산식 버전. DAMAGE_K 변경 시 과거 점수와 구분하기 위함 */
    @Column(length = 10)
    private String scoreVersion;

     /** 🆕 치아 전체 면적 대비 치석 비율(%). FastAPI report.summary.totalCalculusRatio */
    private Double totalCalculusRatio;
 
    /** 🆕 치아 전체 면적 대비 치태 비율(%). FastAPI report.summary.totalPlaqueRatio */
    private Double totalPlaqueRatio;

    /**
     * UV 이미지의 백색광 치석 2차 검증(§5.3) 진단 JSON — applied / sourceTaskId / matchedTeeth /
     * unmatchedTeeth / reason / calculusPixels / teeth[{areaId, toothNumber, calculusExcludedPixels}].
     * applied=false 이면 reason 으로 원인을 추적한다. 백색광 행은 null.
     */
    @Column(columnDefinition = "TEXT")
    private String calculusCrossCheckJson;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Builder.Default
    @OneToMany(mappedBy = "analysisResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AnalysisToothArea> toothAreas = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "analysisResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AnalysisDetectedIssue> detectedIssues = new ArrayList<>();

    public void addToothArea(AnalysisToothArea toothArea) {
        this.toothAreas.add(toothArea);
        toothArea.setAnalysisResult(this);
    }

    public void addDetectedIssue(AnalysisDetectedIssue detectedIssue) {
        this.detectedIssues.add(detectedIssue);
        detectedIssue.setAnalysisResult(this);
    }
}