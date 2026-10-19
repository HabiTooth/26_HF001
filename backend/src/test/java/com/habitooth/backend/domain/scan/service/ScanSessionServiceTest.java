package com.habitooth.backend.domain.scan.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.dto.response.MeshCoordinateResponse;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.ScanHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScanSessionService - 세션 리포트 소유권 검증")
class ScanSessionServiceTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long SESSION_ID = 10L;

    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private ScanImageRepository scanImageRepository;
    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ScanSessionService scanSessionService;

    @Nested
    @DisplayName("getSessionReport")
    class GetSessionReport {

        @Test
        @DisplayName("다른 사용자의 세션이면 404(SESSION_NOT_FOUND)로 거부하고 분석 결과는 조회하지 않는다")
        void rejectsOtherUsersSession() {
            when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, OTHER_USER_ID))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> scanSessionService.getSessionReport(OTHER_USER_ID, SESSION_ID))
                    .isInstanceOf(ScanHandler.class)
                    .extracting(e -> ((ScanHandler) e).getErrorCode())
                    .isEqualTo(ErrorCode.SESSION_NOT_FOUND);

            verifyNoInteractions(scanImageRepository, analysisResultRepository);
        }

        @Test
        @DisplayName("본인 세션이면 기존대로 리포트를 돌려준다")
        void returnsReportForOwner() {
            ScanSession session = ScanSession.create(OWNER_ID, 99L);
            ScanImage image = ScanImage.builder()
                    .scanSession(session)
                    .viewType(ViewType.LOWER_FRONT)
                    .lightType(LightType.WHITE_LIGHT)
                    .build();
            AnalysisResult result = AnalysisResult.builder()
                    .scanImage(image)
                    .viewType(ViewType.LOWER_FRONT)
                    .zoneScore(80.0)
                    .build();

            when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, OWNER_ID))
                    .thenReturn(Optional.of(session));
            when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of(image));
            when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(result));

            MeshCoordinateResponse response = scanSessionService.getSessionReport(OWNER_ID, SESSION_ID);

            assertThat(response.getSessionId()).isEqualTo(SESSION_ID);
            assertThat(response.getAverageScore()).isEqualTo(80);
            assertThat(response.getToothSummaries()).isEmpty();
        }
    }
}
