package com.habitooth.backend.domain.history.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class HistoryListResponse {
    private Integer totalCount;
    private Integer page;
    private Integer size;
    private Integer totalPages;
    private List<HistoryListItem> items;
}
