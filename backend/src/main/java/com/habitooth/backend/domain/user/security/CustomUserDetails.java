package com.habitooth.backend.domain.user.security;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * 인증 principal. JWT 인증 후 SecurityContext에 담기며, 컨트롤러에서
 * {@code @AuthenticationPrincipal CustomUserDetails} 로 주입받아 userId를 바로 사용한다.
 *
 * <p>기존엔 토큰 subject(email)만으로 매 요청마다 User를 재조회해야 했으나,
 * 인증 시점에 조회한 userId를 여기에 실어두면 이후 도메인(device/record/llm/home 등)에서
 * 추가 DB 조회 없이 userId를 얻는다.
 */
@Getter
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final Long userId;
    private final String email;
    private final String password;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 현재 ROLE 미사용. 추후 권한 도입 시 여기에 매핑.
        return List.of();
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        // Spring Security 규약상 username = 식별자(email)
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}