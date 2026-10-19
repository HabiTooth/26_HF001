package com.habitooth.backend.domain.user.repository;

import com.habitooth.backend.domain.user.entity.UserMissingTooth;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserMissingToothRepository extends JpaRepository<UserMissingTooth, Long> {
    List<UserMissingTooth> findAllByUserId(Long userId);

    void deleteAllByUserId(Long userId);
}
