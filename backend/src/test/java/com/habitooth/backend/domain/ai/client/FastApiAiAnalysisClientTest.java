package com.habitooth.backend.domain.ai.client;

import com.habitooth.backend.domain.ai.dto.response.AiAnalyzeResponse;
import com.habitooth.backend.domain.ai.dto.response.CalculusCrossCheckResult;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 실제 HTTP 로 main_v12 계약(엔드포인트 순서, snake_case 폼 필드, 쿼리 파라미터,
 * 본문 플래그 역직렬화)을 검증한다. FastAPI 대신 JDK HttpServer 로 v12 응답을 흉내 낸다.
 */
class FastApiAiAnalysisClientTest {

    private static final long SESSION_ID = 10L;
    private static final String WHITE_TASK = "white-task";
    private static final String UV_TASK = "uv-task";

    private record Call(String method, String path, String query, String body) {
        String line() {
            return method + " " + path + (query == null ? "" : "?" + query);
        }
    }

    private HttpServer server;
    private FastApiAiAnalysisClient client;
    private final List<Call> calls = new CopyOnWriteArrayList<>();
    private final Deque<String> taskIds = new ArrayDeque<>();
    /** path → 고정 응답 본문 오버라이드 (실패 시나리오용) */
    private final Map<String, String> overrides = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", this::handle);
        server.start();

        WebClient webClient = WebClient.builder()
                .baseUrl("http://localhost:" + server.getAddress().getPort())
                .build();
        client = new FastApiAiAnalysisClient(webClient);
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    @DisplayName("백색광 calculus → UV plaque-fluorescence(calculus_task_id) → 두 task cleanup 의 실제 HTTP 순서와 필드")
    void whiteThenUv_httpSequenceAndFields() {
        taskIds.add(WHITE_TASK);
        taskIds.add(UV_TASK);

        String whiteTaskId = client.initTask("18,28");
        AiAnalyzeResponse white = client.analyzeWhite(
                whiteTaskId, 2L, image(), "white.jpg", ViewType.UPPER_FRONT, SESSION_ID);

        String uvTaskId = client.initTask("18,28");
        AiAnalyzeResponse uv = client.analyzeUv(
                uvTaskId, 1L, image(), "uv.jpg", ViewType.UPPER_FRONT, SESSION_ID, whiteTaskId);

        client.cleanupTask(whiteTaskId);
        client.cleanupTask(uvTaskId);

        assertThat(calls).extracting(Call::line).containsExactly(
                "POST /api/ai/task/init",
                "POST /api/ai/preprocess",
                "POST /api/ai/predict/tooth-area",
                "POST /api/ai/predict/calculus",
                "POST /api/ai/report/generate",
                "GET /api/ai/task/white-task/result?include_geometry=true",
                "POST /api/ai/task/init",
                "POST /api/ai/preprocess",
                "POST /api/ai/predict/tooth-area",
                "POST /api/ai/predict/plaque-fluorescence",   // report 보다 먼저
                "POST /api/ai/report/generate",
                "GET /api/ai/task/uv-task/result?include_geometry=true",
                "GET /api/ai/task/white-task/result?cleanup=true",   // UV 분석이 끝난 뒤에야 정리
                "GET /api/ai/task/uv-task/result?cleanup=true"
        );

        // snake_case 폼 필드
        assertThat(formField(calls.get(0).body(), "missing_teeth")).isEqualTo("18,28");
        assertThat(formField(calls.get(1).body(), "task_id")).isEqualTo(WHITE_TASK);
        assertThat(formField(calls.get(1).body(), "zone")).isEqualTo("UPPER_FRONT");
        assertThat(formField(calls.get(3).body(), "mode")).isEqualTo("CALCULUS");
        assertThat(formField(calls.get(4).body(), "session_id")).isEqualTo("10");
        assertThat(formField(calls.get(9).body(), "task_id")).isEqualTo(UV_TASK);
        assertThat(formField(calls.get(9).body(), "calculus_task_id")).isEqualTo(WHITE_TASK);

        // 백색광: FastAPI 점수 그대로 + include_geometry 로 받은 polygon
        assertThat(white.getZoneScore()).isEqualTo(82.4);
        assertThat(white.getZoneValid()).isTrue();
        assertThat(white.getDetectedToothCount()).isEqualTo(4);
        assertThat(white.getScoreVersion()).isEqualTo("2.3");
        assertThat(white.getExpectedToothCount()).isEqualTo(2);
        assertThat(white.getCoverageRatio()).isEqualTo(0.5);
        // 2.3: 기대 치아 전부가 오고, 미검출 치아는 NOT_DETECTED + riskLevel "UNKNOWN" (예전엔 여기서 enum 변환 예외로 분석 전체가 실패)
        assertThat(white.getToothStatuses()).hasSize(2);
        assertThat(white.getToothStatuses().get(0)).satisfies(t -> {
            assertThat(t.getStatus()).isEqualTo(ToothDetectionStatus.DETECTED);
            assertThat(t.getToothScore()).isEqualTo(91.6);
        });
        assertThat(white.getToothStatuses().get(1)).satisfies(t -> {
            assertThat(t.getToothNumber()).isEqualTo(12);
            assertThat(t.getStatus()).isEqualTo(ToothDetectionStatus.NOT_DETECTED);
            assertThat(t.getAreaRatio()).isNull();
            assertThat(t.getToothScore()).isNull();
            assertThat(t.getRiskLevel()).isNull();
        });
        assertThat(white.getIssues()).singleElement()
                .satisfies(i -> assertThat(i.getPolygon()).hasSize(3));
        assertThat(white.getTotalCalculusRatio()).isEqualTo(1.2);
        assertThat(white.getCalculusCrossCheck()).isNull();

        // 결과 오버레이: report/generate 에 include_overlay 를 보내고, base64 PNG 를 디코딩해 둔다.
        assertThat(formField(calls.get(4).body(), "include_overlay")).isEqualTo("true");
        assertThat(white.getOverlay()).isNotNull();
        assertThat(white.getOverlay().getPng()).containsExactly(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);
        assertThat(white.getOverlay().getWidth()).isEqualTo(1600);
        assertThat(white.getOverlay().getHeight()).isEqualTo(1200);
        assertThat(uv.getOverlay()).isNull();   // UV 응답(구버전 형태)에는 overlayImage 가 없다
        // UV 2.3: FastAPI 가 형광 구역 점수(fluorescenceZoneScore)를 주므로 그대로 싣는다.
        //   형광 치태는 toothStatuses(PLAQUE) + issues(confidence=null) 로. SKIPPED/NOT_DETECTED 는 상태만 남기고 점수 없음.
        //   plaqueRegions 는 FastAPI 가 이미 치석 겹침을 뺀 그대로 읽는다.
        assertThat(uv.getZoneScore()).isEqualTo(62.8);
        assertThat(uv.getZoneValid()).isTrue();
        assertThat(uv.getScoreVersion()).isEqualTo("2.3");
        assertThat(uv.getDetectedToothCount()).isEqualTo(1);
        assertThat(uv.getExpectedToothCount()).isEqualTo(3);
        assertThat(uv.getTotalPlaqueRatio()).isEqualTo(8.3);
        assertThat(uv.getToothStatuses()).hasSize(3);
        assertThat(uv.getToothStatuses().get(0)).satisfies(t -> {
            assertThat(t.getToothNumber()).isEqualTo(11);
            assertThat(t.getStatus()).isEqualTo(ToothDetectionStatus.DETECTED);
            assertThat(t.getLesionType()).isEqualTo(LesionType.PLAQUE);
            assertThat(t.getAreaRatio()).isEqualTo(12.4);
            assertThat(t.getToothScore()).isEqualTo(62.8);   // FastAPI 값 그대로
            assertThat(t.getRiskLevel()).isEqualTo(RiskLevel.HIGH);
        });
        assertThat(uv.getToothStatuses().get(1).getStatus()).isEqualTo(ToothDetectionStatus.SKIPPED);
        assertThat(uv.getToothStatuses().get(2)).satisfies(t -> {
            assertThat(t.getToothNumber()).isEqualTo(21);
            assertThat(t.getStatus()).isEqualTo(ToothDetectionStatus.NOT_DETECTED);
            assertThat(t.getAreaRatio()).isNull();
            assertThat(t.getRiskLevel()).isNull();
        });
        assertThat(uv.getIssues()).singleElement().satisfies(issue -> {
            assertThat(issue.getLesionType()).isEqualTo(LesionType.PLAQUE);
            assertThat(issue.getConfidence()).isNull();
            assertThat(issue.getPolygon()).hasSize(3);
        });

        CalculusCrossCheckResult crossCheck = uv.getCalculusCrossCheck();
        assertThat(crossCheck.getApplied()).isTrue();
        assertThat(crossCheck.getSourceTaskId()).isEqualTo(WHITE_TASK);
        assertThat(crossCheck.getMatchedTeeth()).containsExactly("11");
        assertThat(crossCheck.getTeeth())
                .extracting(CalculusCrossCheckResult.ToothExclusion::getToothNumber,
                        CalculusCrossCheckResult.ToothExclusion::getCalculusExcludedPixels)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(11, 120),
                        org.assertj.core.groups.Tuple.tuple(12, 0),
                        org.assertj.core.groups.Tuple.tuple(21, 0));
    }

    @Test
    @DisplayName("calculus_task_id 가 null 이면 폼 필드를 보내지 않는다")
    void uvWithoutCalculusTaskId_omitsField() {
        overrides.put("/api/ai/predict/plaque-fluorescence", fluorescenceJson(false, "calculus 미실행"));

        AiAnalyzeResponse uv = client.analyzeUv(UV_TASK, 1L, image(), "uv.jpg", ViewType.UPPER_FRONT, SESSION_ID, null);

        Call fluorescence = calls.stream()
                .filter(c -> c.path().endsWith("/plaque-fluorescence")).findFirst().orElseThrow();
        assertThat(fluorescence.body()).doesNotContain("name=\"calculus_task_id\"");
        assertThat(uv.getCalculusCrossCheck().getApplied()).isFalse();
        assertThat(uv.getCalculusCrossCheck().getReason()).isEqualTo("calculus 미실행");
    }

    @Test
    @DisplayName("HTTP 200 이어도 report success=false(AI400) 면 실패 처리한다")
    void reportSuccessFalse_onHttp200_throws() {
        overrides.put("/api/ai/report/generate",
                "{\"code\":\"AI400\",\"message\":\"분석 결과가 없습니다.\",\"result\":null,\"success\":false}");

        assertThatThrownBy(() -> client.analyzeWhite(
                WHITE_TASK, 2L, image(), "white.jpg", ViewType.UPPER_FRONT, SESSION_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AI_REPORT_FAILED);
    }

    @Test
    @DisplayName("HTTP 200 이어도 plaque-fluorescence isSuccess=false 면 실패 처리한다")
    void fluorescenceIsSuccessFalse_onHttp200_throws() {
        overrides.put("/api/ai/predict/plaque-fluorescence",
                "{\"isSuccess\":false,\"message\":\"캐싱된 이미지가 없습니다.\"}");

        assertThatThrownBy(() -> client.analyzeUv(
                UV_TASK, 1L, image(), "uv.jpg", ViewType.UPPER_FRONT, SESSION_ID, WHITE_TASK))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AI_PLAQUE_FAILED);
    }

    @Test
    @DisplayName("미완료 task cleanup(\"아직 완료되지 않은 Task\") 은 예외 없이 넘어간다")
    void cleanupOfIncompleteTask_doesNotThrow() {
        assertThatCode(() -> client.cleanupTask("failed-task")).doesNotThrowAnyException();
        assertThat(calls).extracting(Call::line)
                .containsExactly("GET /api/ai/task/failed-task/result?cleanup=true");
    }

    // ------------------------------------------------------------------
    // fake FastAPI (main_v12 응답 형태)
    // ------------------------------------------------------------------

    private void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String query = exchange.getRequestURI().getQuery();
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        calls.add(new Call(exchange.getRequestMethod(), path, query, body));

        String response = overrides.getOrDefault(path, defaultResponse(path, query, body));
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String defaultResponse(String path, String query, String body) {
        if (path.equals("/api/ai/task/init")) {
            return "{\"taskId\":\"" + taskIds.poll() + "\",\"missingTeeth\":[18,28]}";
        }
        if (path.equals("/api/ai/preprocess") || path.equals("/api/ai/predict/tooth-area")) {
            return "{\"isSuccess\":true,\"message\":\"ok\"}";
        }
        if (path.equals("/api/ai/predict/calculus")) {
            return "{\"isSuccess\":true,\"message\":\"ok\",\"toothStatuses\":[],\"totalCalculusRatio\":1.2,"
                    + "\"totalPlaqueRatio\":0.0,\"zoneScore\":82.4,\"zoneValid\":true,\"detectedToothCount\":4,"
                    + "\"scoreVersion\":\"2.2\",\"debugRawDetections\":[{\"confidence\":0.05,\"passed_threshold\":false}]}";
        }
        if (path.equals("/api/ai/predict/plaque-fluorescence")) {
            return fluorescenceJson(true, null);
        }
        if (path.equals("/api/ai/report/generate")) {
            return UV_TASK.equals(formField(body, "task_id")) ? uvReportJson() : whiteReportJson();
        }
        if (path.endsWith("/result")) {
            if (query != null && query.contains("cleanup=true")) {
                return path.contains("failed-task")
                        ? "{\"isSuccess\":false,\"message\":\"아직 분석이 완료되지 않은 Task입니다.\"}"
                        : "{\"isSuccess\":true,\"message\":\"ok\",\"result\":{}}";
            }
            return "{\"isSuccess\":true,\"message\":\"ok\",\"result\":{"
                    + "\"toothArea\":[{\"areaId\":1,\"toothNumber\":11,\"polygon\":" + polygon() + "}],"
                    + "\"detectedIssues\":[{\"toothNumber\":11,\"issueType\":\"CALCULUS\",\"confidence\":0.42,"
                    + "\"polygon\":" + polygon() + "}],\"zoneScore\":82.4}}";
        }
        return "{\"isSuccess\":false,\"message\":\"unknown path\"}";
    }

    private static String polygon() {
        return "[{\"x\":800,\"y\":600},{\"x\":820,\"y\":600},{\"x\":810,\"y\":630}]";
    }

    private static String whiteReportJson() {
        return "{\"code\":\"AI200\",\"message\":\"구강 분석 완료\",\"success\":true,\"result\":{"
                + "\"sessionId\":10,\"zone\":\"UPPER_FRONT\",\"surface\":\"INNER\","
                + "\"zoneScore\":82.4,\"zoneValid\":true,\"detectedToothCount\":4,"
                + "\"expectedToothCount\":2,\"coverageRatio\":0.5,"
                + "\"zoneScoreBreakdown\":{\"expectedToothCount\":2,\"detectedToothCount\":1,\"coverageRatio\":0.5,"
                + "\"meanScore\":82.4,\"minScore\":82.4,\"minScoreTooth\":11},"
                + "\"overlay\":{\"image\":\"iVBORw0KGgo=\",\"width\":1600,\"height\":1200,\"format\":\"png\"},"
                + "\"toothOverlays\":[],"
                + "\"scoreVersion\":\"2.3\",\"summary\":{\"totalPlaqueRatio\":0.0,\"totalCalculusRatio\":1.2,"
                + "\"totalFluorescencePlaqueRatio\":0.0},"
                + "\"toothStatuses\":[{\"toothNumber\":11,\"surface\":\"INNER\",\"status\":\"DETECTED\","
                + "\"lesionType\":\"CALCULUS\",\"areaRatio\":2.8,\"toothScore\":91.6,\"riskLevel\":\"LOW\"},"
                + "{\"toothNumber\":12,\"surface\":\"INNER\",\"status\":\"NOT_DETECTED\","
                + "\"lesionType\":\"CALCULUS\",\"areaRatio\":null,\"toothScore\":null,\"riskLevel\":\"UNKNOWN\"}],"
                + "\"fluorescenceToothStatuses\":[],\"demoOutputDir\":\"demo_outputs/white\"}}";
    }

    private static String uvReportJson() {
        return "{\"code\":\"AI200\",\"message\":\"구강 분석 완료\",\"success\":true,\"result\":{"
                + "\"sessionId\":10,\"zone\":\"UPPER_FRONT\",\"surface\":\"INNER\","
                + "\"zoneScore\":null,\"zoneValid\":false,\"detectedToothCount\":1,"
                + "\"expectedToothCount\":3,\"coverageRatio\":0.333,"
                + "\"fluorescenceZoneScore\":62.8,\"fluorescenceZoneValid\":true,"
                + "\"scoreVersion\":\"2.3\",\"summary\":{\"totalPlaqueRatio\":0.0,\"totalCalculusRatio\":0.0,"
                + "\"totalFluorescencePlaqueRatio\":8.3},\"toothStatuses\":[],"
                + "\"fluorescenceToothStatuses\":" + fluorescenceTeethJson() + ",\"demoOutputDir\":null}}";
    }

    private static String fluorescenceTeethJson() {
        // 2.3: DETECTED(11) / SKIPPED(12, 픽셀 부족) / NOT_DETECTED(21, 사진에 없음)
        return "[{\"areaId\":1,\"toothNumber\":11,\"surface\":\"INNER\",\"status\":\"DETECTED\","
                + "\"plaqueRatio\":12.4,\"pixelCount\":5120,\"flaggedPixels\":635,"
                + "\"skipped\":false,\"plaqueRegions\":[{\"regionId\":1,\"pixelCount\":635,\"polygon\":" + polygon() + "}],"
                + "\"calculusExcludedPixels\":120,\"toothScore\":62.8,\"riskLevel\":\"HIGH\"},"
                + "{\"areaId\":2,\"toothNumber\":12,\"surface\":\"INNER\",\"status\":\"SKIPPED\","
                + "\"plaqueRatio\":0.0,\"pixelCount\":20,\"flaggedPixels\":0,"
                + "\"skipped\":true,\"plaqueRegions\":[],\"calculusExcludedPixels\":0,\"toothScore\":null,\"riskLevel\":\"UNKNOWN\"},"
                + "{\"areaId\":null,\"toothNumber\":21,\"surface\":\"INNER\",\"status\":\"NOT_DETECTED\","
                + "\"plaqueRatio\":null,\"pixelCount\":0,\"flaggedPixels\":0,"
                + "\"skipped\":true,\"plaqueRegions\":[],\"calculusExcludedPixels\":0,\"toothScore\":null,\"riskLevel\":\"UNKNOWN\"}]";
    }

    private static String fluorescenceJson(boolean applied, String reason) {
        String crossCheck = applied
                ? "{\"applied\":true,\"sourceTaskId\":\"white-task\",\"matchedTeeth\":[11],\"unmatchedTeeth\":[],"
                        + "\"reason\":null,\"calculusPixels\":120}"
                : "{\"applied\":false,\"sourceTaskId\":null,\"matchedTeeth\":[],\"unmatchedTeeth\":[],"
                        + "\"reason\":\"" + reason + "\"}";
        return "{\"isSuccess\":true,\"message\":\"UV 형광 기반 치태 분석 완료\",\"totalFluorescencePlaqueRatio\":8.3,"
                + "\"toothStatuses\":" + fluorescenceTeethJson() + ",\"calculusCrossCheck\":" + crossCheck + "}";
    }

    /** multipart 본문에서 텍스트 필드 값을 꺼낸다. 없으면 null. */
    private static String formField(String multipartBody, String name) {
        Matcher m = Pattern.compile(
                "name=\"" + Pattern.quote(name) + "\"\\r\\n(?:[^\\r\\n]+\\r\\n)*\\r\\n(.*?)\\r\\n--",
                Pattern.DOTALL).matcher(multipartBody);
        return m.find() ? m.group(1) : null;
    }

    private static ByteArrayResource image() {
        return new ByteArrayResource(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
    }
}
