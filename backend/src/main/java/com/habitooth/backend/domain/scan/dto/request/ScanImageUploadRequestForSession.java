package com.habitooth.backend.domain.scan.dto.request;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Data
public class ScanImageUploadRequestForSession {
    private LightType lightType;
    private ViewType viewType;
    private String imageUrl;
}