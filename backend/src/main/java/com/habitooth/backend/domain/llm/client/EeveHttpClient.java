package com.habitooth.backend.domain.llm.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportRequestInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import com.habitooth.backend.domain.llm.dto.eeve.EeveIssue;
import com.habitooth.backend.domain.llm.dto.eeve.EeveManagementItem;
import com.habitooth.backend.domain.llm.dto.eeve.EevePrevIssue;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportRequest;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportResponse;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportResult;
import com.habitooth.backend.domain.llm.dto.eeve.EeveRiskDetailItem;
import com.habitooth.backend.domain.llm.dto.eeve.EeveZone;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.LlmReportHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.function.Supplier;

@Slf4j
@Component
public class EeveHttpClient implements LlmReportClient {

    private final WebClient llmWebClient;
    private final ObjectMapper objectMapper;

    public EeveHttpClient(@Qualifier("llmWebClient") WebClient llmWebClient, ObjectMapper objectMapper) {
        this.llmWebClient = llmWebClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public LlmReportResult generateReport(LlmReportRequestInput input) {
        // 직렬화한 문자열을 그대로 바디로 보낸다. toRequestJson 과 같은 경로를 타므로
        // 로그에 남는 request_json 과 실제 전송 바이트가 어긋날 수 없다.
        String body = toRequestJson(input);

        EeveReportResponse response = callEeve(
                () -> llmWebClient.post()
                        .uri("/api/llm/report/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(EeveReportResponse.class)
                        .block(),
                ErrorCode.LLM_REPORT_GENERATION_FAILED
        );

        if (!Boolean.TRUE.equals(response.getIsSuccess())) {
            throw new LlmReportHandler(ErrorCode.LLM_REPORT_GENERATION_FAILED);
        }

        JsonNode result = response.getResult();
        if (result == null || result.isNull()) {
            throw new LlmReportHandler(ErrorCode.LLM_REPORT_RESULT_EMPTY);
        }

        return convertToResult(result);
    }

    @Override
    public String toRequestJson(LlmReportRequestInput input) {
        try {
            return objectMapper.writeValueAsString(convertRequest(input));
        } catch (JsonProcessingException e) {
            log.error("EEVE 요청 직렬화 실패", e);
            throw new LlmReportHandler(ErrorCode.LLM_REPORT_GENERATION_FAILED);
        }
    }

    private EeveReportRequest convertRequest(LlmReportRequestInput input) {
        return EeveReportRequest.builder()
                .totalScore(input.getTotalScore())
                .prevTotalScore(input.getPrevTotalScore())
                .capturedZoneCount(input.getCapturedZoneCount())
                .totalZoneCount(input.getTotalZoneCount())
                .zones(convertZones(input.getZones()))
                .teeth(convertTeeth(input.getTeeth()))
                .prevZones(convertZones(input.getPrevZones()))
                .prevTeeth(convertPrevTeeth(input.getPrevTeeth()))
                .build();
    }

    private List<EeveZone> convertZones(List<LlmZoneInput> zones) {
        if (zones == null) {
            return null;
        }

        return zones.stream()
                .map(z -> EeveZone.builder()
                        .viewType(z.getViewType() == null ? null : z.getViewType().name())
                        .lightType(z.getLightType() == null ? null : z.getLightType().name())
                        .zoneScore(z.getZoneScore())
                        .zoneValid(z.getZoneValid())
                        .detectedToothCount(z.getDetectedToothCount())
                        .totalCalculusRatio(z.getTotalCalculusRatio())
                        .totalPlaqueRatio(z.getTotalPlaqueRatio())
                        .build())
                .toList();
    }

    private List<EeveIssue> convertTeeth(List<LlmIssueInput> teeth) {
        if (teeth == null) {
            return null;
        }

        return teeth.stream()
                .map(t -> EeveIssue.builder()
                        .toothNumber(t.getToothNumber())
                        .lesionType(t.getLesionType().name())
                        .areaRatio(t.getAreaRatio())
                        .toothScore(t.getToothScore())
                        .riskLevel(t.getRiskLevel() == null ? null : t.getRiskLevel().name())
                        .build())
                .toList();
    }

    private List<EevePrevIssue> convertPrevTeeth(List<LlmPrevIssueInput> prevTeeth) {
        if (prevTeeth == null) {
            return null;
        }

        return prevTeeth.stream()
                .map(p -> EevePrevIssue.builder()
                        .toothNumber(p.getToothNumber())
                        .lesionType(p.getLesionType().name())
                        .areaRatio(p.getAreaRatio())
                        .build())
                .toList();
    }

    /**
     * result 트리 → 내부 결과 DTO.
     *
     * <p>기존 세 필드는 전용 타입으로 매핑하고, v2 확장 필드는 원문 문자열로 함께 들고 나간다.
     * 서버가 필드를 더 붙여도 Spring 변경 없이 {@code report_json} 에 저장된다.
     */
    private LlmReportResult convertToResult(JsonNode result) {
        EeveReportResult typed;
        try {
            typed = objectMapper.treeToValue(result, EeveReportResult.class);
        } catch (JsonProcessingException e) {
            log.error("EEVE result 매핑 실패. result={}", result, e);
            throw new LlmReportHandler(ErrorCode.LLM_SERVER_RESPONSE_ERROR);
        }

        List<LlmReportResult.RiskDetailItem> riskDetail = typed.getRiskDetail() == null
                ? List.of()
                : typed.getRiskDetail().stream()
                        .map(this::convertRiskDetailItem)
                        .toList();

        List<LlmReportResult.ManagementItem> management = typed.getManagement() == null
                ? List.of()
                : typed.getManagement().stream()
                        .map(this::convertManagementItem)
                        .toList();

        return LlmReportResult.builder()
                .riskDetail(riskDetail)
                .management(management)
                .disclaimer(typed.getDisclaimer())
                .rawResultJson(result.toString())
                .build();
    }

    private LlmReportResult.RiskDetailItem convertRiskDetailItem(EeveRiskDetailItem item) {
        return LlmReportResult.RiskDetailItem.builder()
                .title(item.getTitle())
                .detail(item.getDetail())
                .riskLevel(convertRiskLevel(item.getRiskLevel()))
                .build();
    }

    private LlmReportResult.ManagementItem convertManagementItem(EeveManagementItem item) {
        return LlmReportResult.ManagementItem.builder()
                .title(item.getTitle())
                .detail(item.getDetail())
                .build();
    }

    private RiskLevel convertRiskLevel(String riskLevel) {
        if (riskLevel == null) {
            return null;
        }

        try {
            return RiskLevel.valueOf(riskLevel);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private <T> T callEeve(Supplier<T> supplier, ErrorCode errorCode) {
        try {
            T response = supplier.get();

            if (response == null) {
                throw new LlmReportHandler(errorCode);
            }
            return response;
        } catch (LlmReportHandler e) {
            throw e;

        } catch (WebClientRequestException e) {
            log.error("EEVE 서버 연결 실패", e);
            throw new LlmReportHandler(ErrorCode.LLM_SERVER_UNAVAILABLE);

        } catch (WebClientResponseException e) {
            log.error("EEVE 응답 오류. status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new LlmReportHandler(errorCode);

        } catch (Exception e) {
            log.error("EEVE 서버 응답 처리 중 오류", e);
            throw new LlmReportHandler(ErrorCode.LLM_SERVER_RESPONSE_ERROR);
        }
    }
}
