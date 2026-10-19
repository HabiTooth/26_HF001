package com.habitooth.backend.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {
    private final boolean isSuccess;
    private final String code;
    private final String message;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final T result;

    public static <T> ApiResponse<T> success(final T result) {
        return new ApiResponse<>(true, "COMMON200", "요청에 성공했습니다.", result);
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>(true, "COMMON200", "요청에 성공했습니다.", null);
    }

    public static <T> ApiResponse<T> success(String code, String message, T data) {
        return new ApiResponse<>(true, code, message, data);
    }

    public static ApiResponse<Void> fail(String code, String message) {
        return new ApiResponse<>(false, code, message, null);
    }

    public static <T> ApiResponse<T> fail(String code, String message, T data) {
        return new ApiResponse<>(false, code, message, data);
    }

    /**
     * 기존 코드 호환용 메서드.
     * 신규 코드에서는 success() 사용 권장.
     */
    @Deprecated
    public static <T> ApiResponse<T> onSuccess(final T result) {
        return success(result);
    }

    /**
     * 기존 코드 호환용 메서드.
     * 신규 코드에서는 success() 사용 권장.
     */
    @Deprecated
    public static <T> ApiResponse<T> onSuccess(String code, String message, T data) {
        return success(code, message, data);
    }
}
