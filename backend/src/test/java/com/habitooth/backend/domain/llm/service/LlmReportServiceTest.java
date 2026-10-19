package com.habitooth.backend.domain.llm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.llm.client.LlmReportClient;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.response.LlmReportResponse;
import com.habitooth.backend.domain.llm.entity.LlmReport;
import com.habitooth.backend.domain.llm.repository.LlmReportLogRepository;
import com.habitooth.backend.domain.llm.repository.LlmReportRepository;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LlmReportServiceTest {

    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long SESSION_ID = 10L;

    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private LlmReportClient llmReportClient;
    @Mock
    private LlmReportRepository llmReportRepository;
    @Mock
    private LlmReportLogRepository llmReportLogRepository;

    private LlmReportService llmReportService;
    private ScanSession session;

    @BeforeEach
    void setUp() {
        llmReportService = new LlmReportService(
                scanSessionRepository, analysisResultRepository, llmReportClient,
                llmReportRepository, llmReportLogRepository, new ObjectMapper()
        );

        session = ScanSession.builder().userId(USER_ID).deviceId(100L).build();
        ReflectionTestUtils.setField(session, "id", SESSION_ID);
    }

    @Test
    @DisplayName("저장된 리포트 조회 - EEVE 재호출 없이 llm_report 를 그대로 응답으로 변환")
    void getSessionLlmReport_returnsStoredReport() {
        LlmReport llmReport = LlmReport.builder()
                .scanSessionId(SESSION_ID)
                .riskDetailJson("[{\"title\":\"오른쪽 위 어금니 치석\",\"detail\":\"설명\",\"riskLevel\":\"HIGH\"}]")
                .managementJson("[{\"title\":\"치과 스케일링\",\"detail\":\"실천법\"}]")
                .disclaimer("면책 문구")
                .build();

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.of(llmReport));

        LlmReportResponse response = llmReportService.getSessionLlmReport(USER_ID, SESSION_ID);

        assertThat(response.getSessionId()).isEqualTo(SESSION_ID);
        assertThat(response.getDisclaimer()).isEqualTo("면책 문구");
        assertThat(response.getRiskDetail()).hasSize(1);
        assertThat(response.getRiskDetail().get(0).getTitle()).isEqualTo("오른쪽 위 어금니 치석");
        assertThat(response.getRiskDetail().get(0).getRiskLevel()).isEqualTo(RiskLevel.HIGH);
        assertThat(response.getManagement()).hasSize(1);
        assertThat(response.getManagement().get(0).getTitle()).isEqualTo("치과 스케일링");
    }

    @Test
    @DisplayName("저장된 리포트 없음 - 404 (LLM_REPORT_NOT_FOUND)")
    void getSessionLlmReport_notGeneratedYet_throws() {
        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> llmReportService.getSessionLlmReport(USER_ID, SESSION_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LLM_REPORT_NOT_FOUND);
    }

    @Test
    @DisplayName("존재하지 않는 세션 - 404 (SESSION_NOT_FOUND)")
    void getSessionLlmReport_sessionNotFound_throws() {
        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> llmReportService.getSessionLlmReport(USER_ID, SESSION_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_NOT_FOUND);
    }

    @Test
    @DisplayName("타인 세션 조회 - 403 (FORBIDDEN)")
    void getSessionLlmReport_otherUsersSession_throws() {
        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> llmReportService.getSessionLlmReport(OTHER_USER_ID, SESSION_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    @DisplayName("teeth payload - areaRatio 0 인 정상 치아는 제외하고 실제 병변만 EEVE 서버로 전달")
    void generateSessionLlmReport_filtersZeroAreaRatioFromTeeth() {
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

        AnalysisResult result = AnalysisResult.builder()
                .toothAreas(List.of(
                        toothArea(16, LesionType.CALCULUS, 12.5),  // 실제 병변
                        toothArea(17, LesionType.PLAQUE, 0.0),      // 검사함 + 이상 없음
                        toothArea(26, LesionType.CALCULUS, null)    // 비율 미기록
                ))
                .build();

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(result));
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any(), any(), any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        ArgumentCaptor<List<LlmIssueInput>> teethCaptor = ArgumentCaptor.forClass(List.class);
        org.mockito.Mockito.verify(llmReportClient).generateReport(any(), teethCaptor.capture(), any());

        assertThat(teethCaptor.getValue())
                .extracting(LlmIssueInput::getToothNumber)
                .containsExactly(16);
    }

    @Test
    @DisplayName("prevTeeth payload - 이전 세션의 areaRatio 0 치아도 제외 (PERSISTED/RESOLVED 오판 방지)")
    void generateSessionLlmReport_filtersZeroAreaRatioFromPrevTeeth() {
        long prevSessionId = 9L;
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

        ScanSession prevSession = ScanSession.builder()
                .userId(USER_ID).deviceId(100L)
                .status(ScanSessionStatus.COMPLETED)
                .startedAt(LocalDateTime.now().minusDays(7))
                .build();
        ReflectionTestUtils.setField(prevSession, "id", prevSessionId);

        AnalysisResult currentResult = AnalysisResult.builder()
                .toothAreas(List.of(toothArea(16, LesionType.CALCULUS, 12.5)))
                .build();
        AnalysisResult prevResult = AnalysisResult.builder()
                .toothAreas(List.of(
                        toothArea(16, LesionType.CALCULUS, 8.0),  // 이전 실제 병변
                        toothArea(21, LesionType.PLAQUE, 0.0)     // 이전에도 이상 없던 치아
                ))
                .build();

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(currentResult));
        when(analysisResultRepository.findLatestSuccessBySessionId(prevSessionId)).thenReturn(List.of(prevResult));
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.of(prevSession));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any(), any(), any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        ArgumentCaptor<List<LlmPrevIssueInput>> prevCaptor = ArgumentCaptor.forClass(List.class);
        org.mockito.Mockito.verify(llmReportClient).generateReport(any(), any(), prevCaptor.capture());

        assertThat(prevCaptor.getValue())
                .extracting(LlmPrevIssueInput::getToothNumber)
                .containsExactly(16);
    }

    private AnalysisToothArea toothArea(Integer toothNumber, LesionType lesionType, Double areaRatio) {
        return AnalysisToothArea.builder()
                .toothNumber(toothNumber)
                .lesionType(lesionType)
                .areaRatio(areaRatio)
                .riskLevel(RiskLevel.MEDIUM)
                .build();
    }

    private LlmReportResult emptyResult() {
        return LlmReportResult.builder()
                .riskDetail(List.of())
                .management(List.of())
                .disclaimer("면책 문구")
                .build();
    }
}
