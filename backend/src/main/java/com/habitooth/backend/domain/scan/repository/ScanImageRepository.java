package com.habitooth.backend.domain.scan.repository;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ScanImageRepository extends JpaRepository<ScanImage, Long> {

    @Query("SELECT s FROM ScanImage s WHERE s.scanSession.id = :sessionId")
    List<ScanImage> findAllByScanSessionId(@Param("sessionId") Long sessionId);

    List<ScanImage> findByScanSessionIdAndLightType(Long scanId, LightType lightType);
    List<ScanImage> findByScanSessionIdAndViewType(Long scanSessionId, ViewType viewType);

    boolean existsByScanSessionIdAndViewTypeAndLightType(
            Long scanSessionId,
            ViewType viewType,
            LightType lightType
    );
    
    Optional<ScanImage> findFirstByScanSessionIdAndLightTypeOrderByCapturedAtDesc(Long scanId, ScanImage scanImage);
}
