package com.habitooth.backend.domain.ai.dto.fastapi;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiToothArea {
    private Integer areaId;
    private Integer toothNumber;
    private List<FastApiPoint> polygon;
}