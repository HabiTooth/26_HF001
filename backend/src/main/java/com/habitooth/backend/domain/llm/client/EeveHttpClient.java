package com.habitooth.backend.domain.llm.client;

import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import com.habitooth.backend.domain.llm.dto.eeve.EeveIssue;
import com.habitooth.backend.domain.llm.dto.eeve.EeveManagementItem;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportRequest;
import com.habitooth.backend.domain.llm.dto.eeve.EeveZone;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportResponse;
import com.habitooth.backend.domain.llm.dto.eeve.EeveReportResult;
import com.habitooth.backend.domain.llm.dto.eeve.EeveRiskDetailItem;
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

    public EeveHttpClient(@Qualifier("llmWebClient") WebClient llmWebClient) {
        this.llmWebClient = llmWebClient;
    }

    @Override
    public LlmReportResult generateReport(
            List<LlmZoneInput> zones,
            List<LlmIssueInput> teeth,
            List<LlmPrevIssueInput> prevTeeth
    ) {
        EeveReportRequest request = EeveReportRequest.builder()
                .zones(convertZones(zones))
                .teeth(convertTeeth(teeth))
                .prevTeeth(convertPrevTeeth(prevTeeth))
                .build();

        EeveReportResponse response = callEeve(
                () -> llmWebClient.post()
                        .uri("/api/llm/report/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(EeveReportResponse.class)
                        .block(),
                ErrorCode.LLM_REPORT_GENERATION_FAILED
        );

        if (!Boolean.TRUE.equals(response.getIsSuccess())) {
            throw new LlmReportHandler(ErrorCode.LLM_REPORT_GENERATION_FAILED);
        }

        if (response.getResult() == null) {
            throw new LlmReportHandler(ErrorCode.LLM_REPORT_RESULT_EMPTY);
        }

        return convertToResult(response.getResult());
    }

    private List<EeveZone> convertZones(List<LlmZoneInput> zones) {
        if (zones == null) {
            return null;
        }

        return zones.stream()
                .map(z -> EeveZone.builder()
                        .viewType(z.getViewType() == null ? null : z.getViewType().name())
                        .zoneScore(z.getZoneScore())
                        .zoneValid(z.getZoneValid())
                        .detectedToothCount(z.getDetectedToothCount())
                        .totalCalculusRatio(z.getTotalCalculusRatio())
                        .totalPlaqueRatio(z.getTotalPlaqueRatio())
                        .build())
                .toList();
    }

    private List<EeveIssue> convertTeeth(List<LlmIssueInput> teeth) {
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

    private List<List<Object>> convertPrevTeeth(List<LlmPrevIssueInput> prevTeeth) {
        if (prevTeeth == null) {
            return null;
        }

        return prevTeeth.stream()
                .map(p -> List.<Object>of(p.getToothNumber(), p.getLesionType().name()))
                .toList();
    }

    private LlmReportResult convertToResult(EeveReportResult result) {
        List<LlmReportResult.RiskDetailItem> riskDetail = result.getRiskDetail() == null
                ? List.of()
                : result.getRiskDetail().stream()
                        .map(this::convertRiskDetailItem)
                        .toList();

        List<LlmReportResult.ManagementItem> management = result.getManagement() == null
                ? List.of()
                : result.getManagement().stream()
                        .map(this::convertManagementItem)
                        .toList();

        return LlmReportResult.builder()
                .riskDetail(riskDetail)
                .management(management)
                .disclaimer(result.getDisclaimer())
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
