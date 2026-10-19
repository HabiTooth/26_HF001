package com.habitooth.backend.domain.llm.repository;

import com.habitooth.backend.domain.llm.entity.LlmReportLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LlmReportLogRepository extends JpaRepository<LlmReportLog, Long> {
}
