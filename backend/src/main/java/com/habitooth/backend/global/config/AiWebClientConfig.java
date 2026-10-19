package com.habitooth.backend.global.config;

import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class AiWebClientConfig {

    @Bean
    public WebClient aiWebClient(
            @Value("${ai.server.base-url}") String baseUrl,
            @Value("${ai.server.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ai.server.read-timeout-ms}") long readTimeoutMs,
            @Value("${ai.server.max-in-memory-size-mb:16}") int maxInMemorySizeMb
    ) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofMillis(readTimeoutMs));

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                // report/generate 응답에 오버레이 PNG 가 base64 로 실린다. WebClient 기본 상한(256KB)으로는
                // DataBufferLimitException 이 나므로 넉넉히 올린다.
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(maxInMemorySizeMb * 1024 * 1024))
                .build();
    }
}