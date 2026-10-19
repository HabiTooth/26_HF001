package com.habitooth.backend.domain.scan.dto.request;

import lombok.Getter;

@Getter
public class ScanSessionCreateRequest {
    private Long userId;
    private Long deviceId;
}
