package com.habitooth.backend.domain.ai.entity;

import com.habitooth.backend.domain.common.type.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "tooth_status", uniqueConstraints = {@UniqueConstraint(columnNames = {"report_id", "tooth_number"})})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToothStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tooth_status_id")
    private Long id;

    @Column(name = "session_id", nullable = false) // ◀ reportId 대신 변경
    private Long sessionId;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "tooth_number", nullable = false)
    private Integer toothNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "plaque_ratio", nullable = false)
    private Double plaqueRatio;

    @Column(name = "calculus_ratio", nullable = false)
    private Double calculusRatio;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}