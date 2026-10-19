package com.habitooth.backend.domain.ai.repository;

import com.habitooth.backend.domain.ai.entity.DetectionResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface  DetectionResultRepository extends JpaRepository<DetectionResult, Long> {
    List<DetectionResult> findByScanImageId(Long scanImageId);

    List<DetectionResult> findAllByScanImageId(Long scanImageId);

    List<DetectionResult> findByScanImage_ScanSession_Id(Long sessionId);
}
