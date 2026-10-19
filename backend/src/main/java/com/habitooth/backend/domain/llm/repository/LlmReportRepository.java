package com.habitooth.backend.domain.llm.repository;

import com.habitooth.backend.domain.llm.entity.LlmReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LlmReportRepository extends JpaRepository<LlmReport, Long> {

    Optional<LlmReport> findByScanSessionId(Long scanSessionId);
}
