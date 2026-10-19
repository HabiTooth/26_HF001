package com.habitooth.backend.domain.user.entity;

import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자의 결손치(발치된 치아) 기록. FDI 번호 1개당 1행이며,
 * {@code (user_id, tooth_number)} 유니크 제약으로 중복을 막는다.
 * 프로필 갱신은 사용자당 전체 행 삭제 후 재삽입(덮어쓰기) 방식이다.
 */
@Entity
@Getter
@Table(name = "user_missing_tooth")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserMissingTooth extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tooth_number", nullable = false)
    private Integer toothNumber;

    private UserMissingTooth(Long userId, Integer toothNumber) {
        this.userId = userId;
        this.toothNumber = toothNumber;
    }

    public static UserMissingTooth of(Long userId, Integer toothNumber) {
        return new UserMissingTooth(userId, toothNumber);
    }
}
