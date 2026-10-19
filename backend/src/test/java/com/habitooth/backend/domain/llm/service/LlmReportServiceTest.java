package com.habitooth.backend.domain.llm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.llm.client.LlmReportClient;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportRequestInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import com.habitooth.backend.domain.llm.dto.response.LlmReportResponse;
import com.habitooth.backend.domain.llm.entity.LlmReport;
import com.habitooth.backend.domain.llm.entity.LlmReportLog;
import com.habitooth.backend.domain.llm.repository.LlmReportLogRepository;
import com.habitooth.backend.domain.llm.repository.LlmReportRepository;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LlmReportServiceTest {

    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long SESSION_ID = 10L;
    private static final long PREV_SESSION_ID = 9L;

    /** LLM 서버 v2 응답 result 샘플. report_json 에 저장되는 원문 그대로. */
    private static final String REPORT_JSON = """
            {
              "riskDetail": [{"title":"아래 앞니 안쪽 치석","detail":"설명","riskLevel":"HIGH"}],
              "management": [{"title":"치과 스케일링","detail":"실천법"}],
              "disclaimer": "면책 문구",
              "score": {
                "total": 87, "prevTotal": 96, "delta": -9,
                "calculusDeduction": 12, "plaqueDeduction": 1, "totalDeduction": 13,
                "recoverableByBrushing": 1, "ceilingByBrushing": 88, "ceilingAfterScaling": 99,
                "calculusToothCount": 4, "plaqueToothCount": 2, "detectedToothCount": 14,
                "capturedZoneCount": 3, "totalZoneCount": 13,
                "primaryReason": "NEW_CALCULUS", "flags": ["LOW_COVERAGE","WORSENING"],
                "formulaText": "100 - 12 - 1 = 87",
                "zones": [{"viewType":"LOWER_FRONT","name":"아래 앞니 안쪽","score":80,"calculusDeduction":20,"plaqueDeduction":0}],
                "scoreMismatch": null
              },
              "interpretation": ["문장1", "문장2", "문장3"],
              "interpretationSource": "llm",
              "actions": [{"code":"SCALING","title":"치과 스케일링 예약","detail":"가까운 치과에 예약하세요.","tag":"+12점","points":12}],
              "logicVersion": "2026-10-17-score-v2.8",
              "notice": "촬영 구역이 적어 일부 구역은 평가되지 않았습니다.",
              "unknownFutureField": {"ignored": true}
            }""";

    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private ScanImageRepository scanImageRepository;
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
                scanSessionRepository, analysisResultRepository, scanImageRepository, llmReportClient,
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
    @DisplayName("구버전 호환 - report_json 이 null 인 기존 행은 v2 필드만 null, 기존 필드는 그대로")
    void getSessionLlmReport_legacyRowWithoutReportJson_v2FieldsAreNull() {
        LlmReport legacy = LlmReport.builder()
                .scanSessionId(SESSION_ID)
                .riskDetailJson("[{\"title\":\"아래 앞니 안쪽 치석\",\"detail\":\"설명\",\"riskLevel\":\"MEDIUM\"}]")
                .managementJson("[{\"title\":\"치실\",\"detail\":\"하루 1회\"}]")
                .disclaimer("면책 문구")
                .reportJson(null)
                .build();

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.of(legacy));

        LlmReportResponse response = llmReportService.getSessionLlmReport(USER_ID, SESSION_ID);

        // 기존 필드는 유지
        assertThat(response.getRiskDetail()).hasSize(1);
        assertThat(response.getRiskDetail().get(0).getRiskLevel()).isEqualTo(RiskLevel.MEDIUM);
        assertThat(response.getManagement()).hasSize(1);
        assertThat(response.getDisclaimer()).isEqualTo("면책 문구");
        // v2 필드는 전부 null
        assertThat(response.getScore()).isNull();
        assertThat(response.getInterpretation()).isNull();
        assertThat(response.getInterpretationSource()).isNull();
        assertThat(response.getActions()).isNull();
        assertThat(response.getNotice()).isNull();
        assertThat(response.getLogicVersion()).isNull();
    }

    @Test
    @DisplayName("역직렬화 - report_json 에 저장된 v2 result 를 score/interpretation/actions/notice 로 복원")
    void getSessionLlmReport_restoresV2PayloadFromReportJson() {
        LlmReport llmReport = LlmReport.builder()
                .scanSessionId(SESSION_ID)
                .riskDetailJson("[{\"title\":\"아래 앞니 안쪽 치석\",\"detail\":\"설명\",\"riskLevel\":\"HIGH\"}]")
                .managementJson("[{\"title\":\"치과 스케일링\",\"detail\":\"실천법\"}]")
                .disclaimer("면책 문구")
                .reportJson(REPORT_JSON)
                .build();

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.of(llmReport));

        LlmReportResponse response = llmReportService.getSessionLlmReport(USER_ID, SESSION_ID);

        assertThat(response.getScore().getTotal()).isEqualTo(87);
        assertThat(response.getScore().getPrevTotal()).isEqualTo(96);
        assertThat(response.getScore().getDelta()).isEqualTo(-9);
        assertThat(response.getScore().getCalculusDeduction()).isEqualTo(12);
        assertThat(response.getScore().getPlaqueDeduction()).isEqualTo(1);
        assertThat(response.getScore().getTotalDeduction()).isEqualTo(13);
        assertThat(response.getScore().getRecoverableByBrushing()).isEqualTo(1);
        assertThat(response.getScore().getCeilingByBrushing()).isEqualTo(88);
        assertThat(response.getScore().getCeilingAfterScaling()).isEqualTo(99);
        assertThat(response.getScore().getCalculusToothCount()).isEqualTo(4);
        assertThat(response.getScore().getPlaqueToothCount()).isEqualTo(2);
        assertThat(response.getScore().getDetectedToothCount()).isEqualTo(14);
        assertThat(response.getScore().getCapturedZoneCount()).isEqualTo(3);
        assertThat(response.getScore().getTotalZoneCount()).isEqualTo(13);
        assertThat(response.getScore().getPrimaryReason()).isEqualTo("NEW_CALCULUS");
        assertThat(response.getScore().getFlags()).containsExactly("LOW_COVERAGE", "WORSENING");
        assertThat(response.getScore().getScoreMismatch()).isNull();
        assertThat(response.getScore().getZones()).hasSize(1);
        assertThat(response.getScore().getZones().get(0).getViewType()).isEqualTo("LOWER_FRONT");
        assertThat(response.getScore().getZones().get(0).getName()).isEqualTo("아래 앞니 안쪽");
        assertThat(response.getScore().getZones().get(0).getScore()).isEqualTo(80);
        assertThat(response.getScore().getZones().get(0).getCalculusDeduction()).isEqualTo(20);

        assertThat(response.getInterpretation()).containsExactly("문장1", "문장2", "문장3");
        assertThat(response.getInterpretationSource()).isEqualTo("llm");
        assertThat(response.getActions()).hasSize(1);
        assertThat(response.getActions().get(0).getCode()).isEqualTo("SCALING");
        assertThat(response.getActions().get(0).getTag()).isEqualTo("+12점");
        assertThat(response.getActions().get(0).getPoints()).isEqualTo(12);
        assertThat(response.getNotice()).isEqualTo("촬영 구역이 적어 일부 구역은 평가되지 않았습니다.");
        assertThat(response.getLogicVersion()).isEqualTo("2026-10-17-score-v2.8");

        // 기존 필드도 그대로 (전용 컬럼에서 읽는다)
        assertThat(response.getDisclaimer()).isEqualTo("면책 문구");
        assertThat(response.getRiskDetail()).hasSize(1);
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
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of());
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        assertThat(capturedInput().getTeeth())
                .extracting(LlmIssueInput::getToothNumber)
                .containsExactly(16);
    }

    @Test
    @DisplayName("prevTeeth payload - 이전 세션의 areaRatio 0 치아도 제외 (PERSISTED/RESOLVED 오판 방지)")
    void generateSessionLlmReport_filtersZeroAreaRatioFromPrevTeeth() {
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

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
        when(analysisResultRepository.findLatestSuccessBySessionId(PREV_SESSION_ID)).thenReturn(List.of(prevResult));
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of());
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.of(prevSession()));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        List<LlmPrevIssueInput> prevTeeth = capturedInput().getPrevTeeth();
        assertThat(prevTeeth).extracting(LlmPrevIssueInput::getToothNumber).containsExactly(16);
        // v2: areaRatio 를 함께 보낸다
        assertThat(prevTeeth).extracting(LlmPrevIssueInput::getAreaRatio).containsExactly(8.0);
    }

    @Test
    @DisplayName("요청 조립(v2) - totalScore/prevTotalScore/구역 수/zones.lightType/prevZones 를 한 번에 담는다")
    void generateSessionLlmReport_assemblesV2RequestFields() {
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

        // 같은 구역을 백색광(치석 86)·UV(치태 92.8)로 촬영 → zones 2줄, 합성 점수 81.7
        List<AnalysisResult> currentResults = List.of(
                analysisResult(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0,
                        List.of(toothArea(31, LesionType.CALCULUS, 4.67))),
                analysisResult(ViewType.LOWER_FRONT, LightType.UV_LIGHT, 92.8,
                        List.of(toothArea(31, LesionType.PLAQUE, 2.4)))
        );
        List<AnalysisResult> prevResults = List.of(
                analysisResult(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 90.0,
                        List.of(toothArea(31, LesionType.CALCULUS, 3.33)))
        );

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(currentResults);
        when(analysisResultRepository.findLatestSuccessBySessionId(PREV_SESSION_ID)).thenReturn(prevResults);
        // 촬영 구역 2개(LOWER_FRONT 는 두 광원이지만 1로 센다)
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of(
                scanImage(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT),
                scanImage(ViewType.LOWER_FRONT, LightType.UV_LIGHT),
                scanImage(ViewType.OUTER_CENTER, LightType.WHITE_LIGHT)
        ));
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.of(prevSession()));
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        LlmReportRequestInput input = capturedInput();

        // totalScore: 100 - (1.0 × 14 + 0.6 × 7.2) = 81.68 → 81.7
        assertThat(input.getTotalScore()).isEqualTo(81.7);
        // 리포트 화면(ReportService)의 종합 점수와 같은 산식·같은 값이어야 한다
        assertThat(ScoreCalculator.roundScore(input.getTotalScore()))
                .isEqualTo(ScoreCalculator.sessionScoreOrZero(currentResults));
        assertThat(input.getPrevTotalScore()).isEqualTo(90.0);

        assertThat(input.getCapturedZoneCount()).isEqualTo(2);
        assertThat(input.getTotalZoneCount()).isEqualTo(ViewType.values().length).isEqualTo(13);

        // zones 는 합치지 않고 광원별 2줄, 각 줄에 lightType
        assertThat(input.getZones()).hasSize(2);
        assertThat(input.getZones()).extracting(LlmZoneInput::getViewType)
                .containsExactly(ViewType.LOWER_FRONT, ViewType.LOWER_FRONT);
        assertThat(input.getZones()).extracting(LlmZoneInput::getLightType)
                .containsExactly(LightType.WHITE_LIGHT, LightType.UV_LIGHT);
        assertThat(input.getZones()).extracting(LlmZoneInput::getZoneScore)
                .containsExactly(86.0, 92.8);

        // prevZones 도 같은 형식
        assertThat(input.getPrevZones()).hasSize(1);
        assertThat(input.getPrevZones().get(0).getLightType()).isEqualTo(LightType.WHITE_LIGHT);
        assertThat(input.getPrevZones().get(0).getZoneScore()).isEqualTo(90.0);
    }

    @Test
    @DisplayName("첫 세션 - 직전 세션이 없으면 prevTotalScore/prevZones/prevTeeth 는 null")
    void generateSessionLlmReport_firstSession_prevFieldsAreNull() {
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(
                analysisResult(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0,
                        List.of(toothArea(31, LesionType.CALCULUS, 4.67)))
        ));
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of(
                scanImage(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT)
        ));
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.generateReport(any())).thenReturn(emptyResult());

        llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        LlmReportRequestInput input = capturedInput();
        assertThat(input.getTotalScore()).isEqualTo(86.0);
        assertThat(input.getPrevTotalScore()).isNull();
        assertThat(input.getPrevZones()).isNull();
        assertThat(input.getPrevTeeth()).isNull();
    }

    @Test
    @DisplayName("생성 응답 - EEVE result 원문을 report_json 에 저장하고 v2 필드까지 바로 응답한다")
    void generateSessionLlmReport_savesRawResultAndReturnsV2Fields() {
        ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now());

        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(
                analysisResult(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0,
                        List.of(toothArea(31, LesionType.CALCULUS, 4.67)))
        ));
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of(
                scanImage(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT)
        ));
        when(scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                anyLong(), any(ScanSessionStatus.class), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(llmReportRepository.findByScanSessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(llmReportClient.toRequestJson(any())).thenReturn("{\"totalScore\":86.0}");
        when(llmReportClient.generateReport(any())).thenReturn(LlmReportResult.builder()
                .riskDetail(List.of(LlmReportResult.RiskDetailItem.builder()
                        .title("아래 앞니 안쪽 치석").detail("설명").riskLevel(RiskLevel.HIGH).build()))
                .management(List.of())
                .disclaimer("면책 문구")
                .rawResultJson(REPORT_JSON)
                .build());

        LlmReportResponse response = llmReportService.generateSessionLlmReport(USER_ID, SESSION_ID);

        // 응답에 v2 필드가 바로 담긴다 (재조회 없이)
        assertThat(response.getScore().getTotal()).isEqualTo(87);
        assertThat(response.getNotice()).isEqualTo("촬영 구역이 적어 일부 구역은 평가되지 않았습니다.");
        assertThat(response.getLogicVersion()).isEqualTo("2026-10-17-score-v2.8");
        assertThat(response.getRiskDetail().get(0).getTitle()).isEqualTo("아래 앞니 안쪽 치석");

        // report_json 에 result 원문이 저장된다
        ArgumentCaptor<LlmReport> reportCaptor = ArgumentCaptor.forClass(LlmReport.class);
        verify(llmReportRepository).save(reportCaptor.capture());
        assertThat(reportCaptor.getValue().getReportJson()).isEqualTo(REPORT_JSON);

        // 로그의 request_json 은 클라이언트가 실제로 보내는 본문 그대로다
        ArgumentCaptor<LlmReportLog> logCaptor = ArgumentCaptor.forClass(LlmReportLog.class);
        verify(llmReportLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getRequestJson()).isEqualTo("{\"totalScore\":86.0}");
        assertThat(logCaptor.getValue().getResponseJson()).isEqualTo(REPORT_JSON);
    }

    private LlmReportRequestInput capturedInput() {
        ArgumentCaptor<LlmReportRequestInput> captor = ArgumentCaptor.forClass(LlmReportRequestInput.class);
        verify(llmReportClient).generateReport(captor.capture());
        return captor.getValue();
    }

    private ScanSession prevSession() {
        ScanSession prevSession = ScanSession.builder()
                .userId(USER_ID).deviceId(100L)
                .status(ScanSessionStatus.COMPLETED)
                .startedAt(LocalDateTime.now().minusDays(7))
                .build();
        ReflectionTestUtils.setField(prevSession, "id", PREV_SESSION_ID);
        return prevSession;
    }

    private AnalysisResult analysisResult(
            ViewType viewType, LightType lightType, Double zoneScore, List<AnalysisToothArea> toothAreas
    ) {
        return AnalysisResult.builder()
                .scanImage(scanImage(viewType, lightType))
                .viewType(viewType)
                .zoneScore(zoneScore)
                .zoneValid(zoneScore != null)
                .detectedToothCount(toothAreas.size())
                .toothAreas(toothAreas)
                .build();
    }

    private ScanImage scanImage(ViewType viewType, LightType lightType) {
        return ScanImage.builder()
                .viewType(viewType)
                .lightType(lightType)
                .imageUrl("mock://" + viewType + "-" + lightType)
                .capturedAt(LocalDateTime.now())
                .build();
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
