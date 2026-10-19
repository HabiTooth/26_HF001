package com.habitooth.backend.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {

         String securitySchemeName = "bearerAuth";

        Info info = new Info()
                .title("HabiTooth backend API")
                .description("HabiTooth backend API 명세서")
                .version("1.0.0");

        return new OpenAPI()
                .info(info)
                .addSecurityItem(
                        new SecurityRequirement()
                                .addList(securitySchemeName)
                ).components(
                    new Components()
                    .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                                .name(securitySchemeName)
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                )
                );
    }
}
