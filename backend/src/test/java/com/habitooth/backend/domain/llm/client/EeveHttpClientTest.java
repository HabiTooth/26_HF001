package com.habitooth.backend.domain.llm.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportRequestInput;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * 실제 전송 본문(JSON) 직렬화 검증. HTTP 는 타지 않고 {@code toRequestJson} 만 본다 —
 * 이 메서드가 {@code generateReport} 가 보내는 바디와 같은 문자열을 만든다.
 */
class EeveHttpClientTest {

    private ObjectMapper objectMapper;
    private EeveHttpClient client;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        client = new EeveHttpClient(mock(WebClient.class), objectMapper);
    }

    @Test
    @DisplayName("prevTeeth 는 2원소 배열이 아니라 toothNumber/lesionType/areaRatio 객체로 나간다")
    void toRequestJson_prevTeethIsObjectForm() throws Exception {
        JsonNode body = serialize(LlmReportRequestInput.builder()
                .zones(List.of())
                .teeth(List.of())
                .prevTeeth(List.of(LlmPrevIssueInput.builder()
                        .toothNumber(16)
                        .lesionType(LesionType.CALCULUS)
                        .areaRatio(12.1)
                        .build()))
                .build());

        JsonNode prevTooth = body.get("prevTeeth").get(0);
        assertThat(prevTooth.isObject()).isTrue();
        assertThat(prevTooth.get("toothNumber").asInt()).isEqualTo(16);
        assertThat(prevTooth.get("lesionType").asText()).isEqualTo("CALCULUS");
        assertThat(prevTooth.get("areaRatio").asDouble()).isEqualTo(12.1);
    }

    @Test
    @DisplayName("zones 는 광원별로 2줄 그대로 나가고 각 줄에 lightType 이 붙는다")
    void toRequestJson_zonesCarryLightTypePerRow() throws Exception {
        JsonNode body = serialize(LlmReportRequestInput.builder()
                .zones(List.of(
                        zone(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0),
                        zone(ViewType.LOWER_FRONT, LightType.UV_LIGHT, 92.8)
                ))
                .teeth(List.of())
                .build());

        JsonNode zones = body.get("zones");
        assertThat(zones).hasSize(2);
        assertThat(zones.get(0).get("viewType").asText()).isEqualTo("LOWER_FRONT");
        assertThat(zones.get(0).get("lightType").asText()).isEqualTo("WHITE_LIGHT");
        assertThat(zones.get(0).get("zoneScore").asDouble()).isEqualTo(86.0);
        assertThat(zones.get(1).get("viewType").asText()).isEqualTo("LOWER_FRONT");
        assertThat(zones.get(1).get("lightType").asText()).isEqualTo("UV_LIGHT");
        assertThat(zones.get(1).get("zoneScore").asDouble()).isEqualTo(92.8);
    }

    @Test
    @DisplayName("점수·구역 수·prevZones 가 요청 최상위 필드로 나간다")
    void toRequestJson_includesScoreAndZoneCounts() throws Exception {
        JsonNode body = serialize(LlmReportRequestInput.builder()
                .totalScore(81.7)
                .prevTotalScore(90.0)
                .capturedZoneCount(4)
                .totalZoneCount(13)
                .zones(List.of(zone(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0)))
                .teeth(List.of(LlmIssueInput.builder()
                        .toothNumber(31)
                        .lesionType(LesionType.CALCULUS)
                        .areaRatio(4.67)
                        .toothScore(86.0)
                        .riskLevel(RiskLevel.MEDIUM)
                        .build()))
                .prevZones(List.of(zone(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 90.0)))
                .prevTeeth(List.of())
                .build());

        assertThat(body.get("totalScore").asDouble()).isEqualTo(81.7);
        assertThat(body.get("prevTotalScore").asDouble()).isEqualTo(90.0);
        assertThat(body.get("capturedZoneCount").asInt()).isEqualTo(4);
        assertThat(body.get("totalZoneCount").asInt()).isEqualTo(13);
        assertThat(body.get("prevZones").get(0).get("lightType").asText()).isEqualTo("WHITE_LIGHT");

        JsonNode tooth = body.get("teeth").get(0);
        assertThat(tooth.get("toothNumber").asInt()).isEqualTo(31);
        assertThat(tooth.get("lesionType").asText()).isEqualTo("CALCULUS");
        assertThat(tooth.get("areaRatio").asDouble()).isEqualTo(4.67);
        assertThat(tooth.get("toothScore").asDouble()).isEqualTo(86.0);
        assertThat(tooth.get("riskLevel").asText()).isEqualTo("MEDIUM");
    }

    @Test
    @DisplayName("첫 세션 - prevTotalScore/prevZones/prevTeeth 는 null 로 나간다(서버가 선택 필드로 받는다)")
    void toRequestJson_firstSessionSendsNullPrevFields() throws Exception {
        JsonNode body = serialize(LlmReportRequestInput.builder()
                .totalScore(86.0)
                .capturedZoneCount(1)
                .totalZoneCount(13)
                .zones(List.of(zone(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 86.0)))
                .teeth(List.of())
                .build());

        assertThat(body.get("prevTotalScore").isNull()).isTrue();
        assertThat(body.get("prevZones").isNull()).isTrue();
        assertThat(body.get("prevTeeth").isNull()).isTrue();
    }

    private JsonNode serialize(LlmReportRequestInput input) throws Exception {
        return objectMapper.readTree(client.toRequestJson(input));
    }

    private LlmZoneInput zone(ViewType viewType, LightType lightType, Double zoneScore) {
        return LlmZoneInput.builder()
                .viewType(viewType)
                .lightType(lightType)
                .zoneScore(zoneScore)
                .zoneValid(true)
                .detectedToothCount(6)
                .totalCalculusRatio(lightType == LightType.WHITE_LIGHT ? 4.67 : null)
                .totalPlaqueRatio(lightType == LightType.UV_LIGHT ? 2.4 : null)
                .build();
    }
}
