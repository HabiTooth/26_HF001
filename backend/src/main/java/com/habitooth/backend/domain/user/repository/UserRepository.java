package com.habitooth.backend.domain.user.repository;

import com.habitooth.backend.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일 중복 가입 확인 메서드
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    boolean existsByIdAndToothProfileSetAtIsNotNull(Long id);

    /** CHECKUP 알림 스케줄러용: 마지막 치과 방문일이 threshold 이전(포함)인 사용자. 미입력자는 제외. */
    List<User> findAllByLastDentalVisitAtIsNotNullAndLastDentalVisitAtLessThanEqual(LocalDate threshold);
}