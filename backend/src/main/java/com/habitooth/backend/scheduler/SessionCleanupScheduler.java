package com.habitooth.backend.scheduler;

import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionCleanupScheduler {

    private final ScanSessionRepository scanSessionRepository;
    private final ScanImageService scanImageService;

    @Scheduled(fixedDelay = 3600_000) // 1시간마다 실행
//    @Scheduled(fixedDelay = 10_000) // 테스트용 10초
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(6); // 6시간 기준 삭제
//        LocalDateTime threshold = LocalDateTime.now().minusMinutes(1); // 테스트용 1분

        List<ScanSession> expiredSessions = scanSessionRepository.findAllByStatusInAndCreatedAtBefore(
                List.of(ScanSessionStatus.READY, ScanSessionStatus.SCANNING),
                threshold
        );

        log.info("Expired sessions found: {}", expiredSessions.size());

        for (ScanSession session : expiredSessions) {
            log.info("Deleting session: id={}, status={}", session.getId(), session.getStatus());

            // 이미지 파일 삭제
            session.getImages().forEach(img -> {
                try {
                    scanImageService.deleteFile(img.getImageUrl());
                    scanImageService.deleteFile(img.getOverlayImageUrl());   // 오버레이는 없을 수 있다(null 이면 no-op)
                } catch (Exception e) {
                    log.warn("Failed to delete image file: {}", img.getImageUrl(), e);
                }
            });

            // DB에서 세션 삭제 (cascade = true로 ScanImage도 삭제)
            scanSessionRepository.delete(session);
            log.info("Session {} deleted successfully.", session.getId());
        }
    }
}
