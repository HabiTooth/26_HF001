package com.habitooth.backend.domain.user.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    // 비밀번호 암호화에 사용할 빈 등록
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // API 접근 권한 설정
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS) // JWT 사용하므로 세션 사용 안 함
                )
                .authorizeHttpRequests(auth -> auth
                        // 개발 단계 중에선 전체 허용
                       .requestMatchers("/api/auth/**").permitAll() // 회원가입, 로그인은 인증 불필요
                       .requestMatchers(                              // swagger
                               "/swagger-ui/**",
                               "/swagger-ui.html",
                               "/v3/api-docs/**"
                       ).permitAll()
                        .anyRequest().permitAll() // authenticated()                // 나머지는 인증 필요
                )
                // 개발 단계 중에선 전체 허용
               .addFilterBefore(
                       new JwtAuthenticationFilter(jwtTokenProvider),
                       UsernamePasswordAuthenticationFilter.class   // 필터 등록
               );

        return http.build();
    }
}