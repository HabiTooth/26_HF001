package com.habitooth.backend.domain.scan.converter;

import com.habitooth.backend.domain.scan.dto.request.ScanImageUploadRequest;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUploadResponse;
import com.habitooth.backend.domain.scan.dto.response.ScanImageUrls;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;

public class ScanConverter {

    private ScanConverter() {}

    public static ScanSession toScanSession(ScanImageUploadRequest request) {
        return ScanSession.create(
                request.getUserId(),
                request.getDeviceId()
        );
    }

    public static ScanImage toScanImage(
            ScanSession scanSession,
            ScanImageUploadRequest request,
            String imageUrl
    ) {
        return ScanImage.create(
                scanSession,
                request.getImageType(),
                request.getRegion(),
                imageUrl
        );
    }

    public static ScanImageUploadResponse toScanImageUploadResponseDTO(ScanImage scanImage) {
        return ScanImageUploadResponse.builder()
                .sessionId(scanImage.getScanSession().getId())
                .imageId(scanImage.getId())
                .lightType(scanImage.getLightType())
                .viewType(scanImage.getViewType())
                .imageUrl(scanImage.getImageUrl())
                .fileUrl(ScanImageUrls.fileUrl(scanImage.getId()))
                .build();
    }
}
