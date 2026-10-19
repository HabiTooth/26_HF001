package com.habitooth.backend.domain.ai.repository;

import com.habitooth.backend.domain.ai.entity.ToothStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ToothStatusRepository extends JpaRepository<ToothStatus, Long> {
    List<ToothStatus> findAllBySessionId(Long sessionId);
    Optional<ToothStatus> findBySessionIdAndToothNumber(Long SessionId, Integer toothNumber);
}