package com.habitooth.backend.global.error;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Common
    _BAD_REQUEST(HttpStatus.BAD_REQUEST,"COMMON400","잘못된 요청입니다."),
    _UNAUTHORIZED(HttpStatus.UNAUTHORIZED,"COMMON401","인증이 필요합니다."),
    _FORBIDDEN(HttpStatus.FORBIDDEN, "COMMON403", "접근 권한이 없습니다."),
    _NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON404", "요청한 리소스를 찾을 수 없습니다."),
    _METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON405", "지원하지 않는 HTTP 메서드입니다."),
    _INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON500", "서버 내부 오류가 발생했습니다."),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH4001", "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH4003", "접근 권한이 없습니다."),
    SOCIAL_LOGIN_FAILED(HttpStatus.BAD_REQUEST, "AUTH4002", "소셜 로그인에 실패했습니다."),
    UNSUPPORTED_PROVIDER(HttpStatus.BAD_REQUEST, "AUTH4004", "지원하지 않는 소셜 로그인입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER4004", "사용자를 찾을 수 없습니다."),
    DUPLICATED_EMAIL(HttpStatus.CONFLICT, "USER4009", "이미 사용 중인 이메일입니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "USER4011", "비밀번호가 일치하지 않습니다."),

    // Image
    EMPTY_IMAGE_FILE(HttpStatus.BAD_REQUEST, "IMAGE4001", "이미지 파일이 비어 있습니다."),
    INVALID_IMAGE_FILE(HttpStatus.BAD_REQUEST, "IMAGE4002", "유효하지 않은 이미지 파일입니다."),
    IMAGE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE5001", "이미지 업로드에 실패했습니다."),

    //AI
    SCAN_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "AI4001", "존재하지 않는 촬영 이미지입니다."),
    SCAN_IMAGE_FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "AI4002", "촬영 이미지 파일을 찾을 수 없습니다."),
    SCAN_IMAGE_FILE_NOT_READABLE(HttpStatus.BAD_REQUEST, "AI4003", "촬영 이미지 파일을 읽을 수 없습니다."),
    SCAN_IMAGE_URL_EMPTY(HttpStatus.BAD_REQUEST, "AI4004", "촬영 이미지 URL이 비어 있습니다."),
    SCAN_IMAGE_URL_INVALID(HttpStatus.BAD_REQUEST, "AI4005", "촬영 이미지 URL 형식이 올바르지 않습니다."),
    ANALYSIS_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "AI4010", "저장된 AI 분석 결과를 찾을 수 없습니다."),
    SCAN_IMAGE_OVERLAY_NOT_FOUND(HttpStatus.NOT_FOUND, "AI4006", "분석 오버레이 이미지가 없습니다. 아직 분석 전이거나 오버레이를 받지 못한 이미지입니다."),

    AI_SERVER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI5001", "AI 서버에 연결할 수 없습니다."),
    AI_SERVER_RESPONSE_ERROR(HttpStatus.BAD_GATEWAY, "AI5002", "AI 서버 응답 처리 중 오류가 발생했습니다."),
    AI_TASK_INIT_FAILED(HttpStatus.BAD_GATEWAY, "AI5003", "AI 분석 태스크 초기화에 실패했습니다."),
    AI_PREPROCESS_FAILED(HttpStatus.BAD_GATEWAY, "AI5004", "AI 이미지 전처리에 실패했습니다."),
    AI_TOOTH_AREA_FAILED(HttpStatus.BAD_GATEWAY, "AI5005", "AI 치아 영역 분석에 실패했습니다."),
    AI_CALCULUS_FAILED(HttpStatus.BAD_GATEWAY, "AI5006", "AI 치석 분석에 실패했습니다."),
    AI_PLAQUE_FAILED(HttpStatus.BAD_GATEWAY, "AI5013", "AI 치태 분석에 실패했습니다."),
    AI_REPORT_FAILED(HttpStatus.BAD_GATEWAY, "AI5007", "AI 리포트 생성에 실패했습니다."),

    AI_TOOTH_AREA_EMPTY(HttpStatus.BAD_GATEWAY, "AI5008", "치아 영역이 검출되지 않았습니다. 재촬영이 필요합니다."),
    AI_REPORT_RESULT_EMPTY(HttpStatus.BAD_GATEWAY, "AI5009", "AI 리포트 결과가 비어 있습니다."),
    AI_ANALYSIS_RESULT_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR,"AI5010","AI 분석 결과 저장 중 오류가 발생했습니다."),
    AI_RESULT_FETCH_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI5011", "AI 상세 분석 결과 조회에 실패했습니다."),

    // Capture Quality Check (촬영 직후 경량 재촬영 판정)
    AI_QUALITY_CHECK_INVALID_REQUEST(HttpStatus.BAD_REQUEST, "AI4011", "촬영 품질 판정 요청이 올바르지 않습니다."),
    AI_QUALITY_CHECK_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI5012", "촬영 품질 판정 서버에 연결할 수 없습니다."),

    // Tooth Profile
    TOOTH_PROFILE_NOT_SET(HttpStatus.BAD_REQUEST, "TOOTH_PROFILE_5010", "치아 프로필이 설정되지 않았습니다. 결손치 정보를 먼저 입력해주세요."),

    // Device
    DEVICE_NOT_FOUND(HttpStatus.NOT_FOUND, "DEVICE_404", "디바이스를 찾을 수 없습니다."),
    DEVICE_ALREADY_REGISTERED(HttpStatus.CONFLICT, "DEVICE_409", "이미 등록된 디바이스입니다."),

    // Scan Session
    SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "SCANSESSION_404", "촬영 세션을 찾을 수 없습니다."),
    NO_IMAGES_IN_SESSION(HttpStatus.NOT_FOUND, "SCANSESSION_4001", "촬영 세션에 등록된 이미지가 없습니다."),

    // Tooth Aggregation
    TOOTH_AGGREGATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI5011", "치아별 분석 결과 집계 중 오류가 발생했습니다."),

    // File Upload / Storage
    INVALID_MULTIPART_REQUEST(HttpStatus.BAD_REQUEST, "IMAGE4003", "Multipart 요청이 올바르지 않습니다."),
    FILE_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE5002", "파일 저장 중 오류가 발생했습니다."),

    // Session Analyze
    ANALYZE_SESSION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI5020", "세션 단위 분석 실행 중 오류가 발생했습니다."),

    // LLM Report
    LLM_SERVER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "LLM5001", "LLM 서버에 연결할 수 없습니다."),
    LLM_SERVER_RESPONSE_ERROR(HttpStatus.BAD_GATEWAY, "LLM5002", "LLM 서버 응답 처리 중 오류가 발생했습니다."),
    LLM_REPORT_GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "LLM5003", "LLM 리포트 생성에 실패했습니다."),
    LLM_REPORT_RESULT_EMPTY(HttpStatus.BAD_GATEWAY, "LLM5004", "LLM 리포트 결과가 비어 있습니다."),
    LLM_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "LLM4001", "생성된 LLM 리포트가 없습니다. 먼저 리포트를 생성해주세요."),

    // Habit
    HABIT_FUTURE_DATE(HttpStatus.BAD_REQUEST, "HABIT4001", "미래 날짜의 습관은 기록할 수 없습니다."),
    HABIT_INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "HABIT4002", "조회 기간이 올바르지 않습니다."),
    HABIT_RANGE_TOO_LARGE(HttpStatus.BAD_REQUEST, "HABIT4003", "습관 기록 조회 기간은 최대 366일까지 가능합니다."),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION4004", "알림을 찾을 수 없습니다."),
    ;

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

}
