package com.habitooth.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@EnableScheduling
@EnableJpaAuditing
@SpringBootApplication
public class BackendApplication {

	/** 서비스 기준 시간대. DB 에 저장되는 모든 LocalDateTime 과 "오늘" 판정이 이 시간대를 따른다. */
	public static final String SERVICE_TIME_ZONE = "Asia/Seoul";

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone(SERVICE_TIME_ZONE));
		SpringApplication.run(BackendApplication.class, args);
	}

}
