package com.habitooth.backend.domain.device.repository;

import com.habitooth.backend.domain.device.entity.Device;
import com.habitooth.backend.domain.device.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    boolean existsByUser_IdAndDevice_Id(Long userId, Long deviceId);

    boolean existsByUser_IdAndDevice(Long userId, Device device);

    List<UserDevice> findByUser_Id(Long userId);
}