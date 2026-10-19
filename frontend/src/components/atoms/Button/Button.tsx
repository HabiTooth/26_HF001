'use client';
import styled, { keyframes, css } from 'styled-components';
import type { ButtonProps } from './Button.types';
const spin = keyframes`
  to { transform: rotate(360deg); }
`;
const SpinnerRing = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;
const StyledButton = styled.button<{
  $variant: string;
  $size: string;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: ${({ theme }) => theme.font.family};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: opacity 0.2s, transform 0.1s;
  white-space: nowrap;
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
  ${({ $size }) =>
    $size === 'sm'
      ? css`height: 40px; padding: 0 16px; font-size: 14px;`
      : $size === 'lg'
        ? css`height: 56px; padding: 0 24px; font-size: 17px;`
        : css`height: 50px; padding: 0 20px; font-size: 15px;`}
  ${({ $variant, theme }) =>
    $variant === 'primary'
      ? css`
          background: ${theme.colors.primaryGradient};
          color: ${theme.colors.textOnPrimary};
          border: none;
          box-shadow: ${theme.shadow.button};
        `
      : $variant === 'ghost'
        ? css`
            background: transparent;
            color: ${theme.colors.primary};
            border: 1px solid ${theme.colors.hairline};
          `
        : $variant === 'danger'
          ? css`
              background: ${theme.colors.danger};
              color: ${theme.colors.textOnPrimary};
              border: none;
            `
          : css`
              background: ${theme.colors.surface};
              color: ${theme.colors.textPrimary};
              border: 1px solid ${theme.colors.hairline};
            `}
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
  &:not(:disabled):active {
    transform: scale(0.98);
    opacity: 0.9;
  }
`;
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  onClick,
  disabled,
  type = 'button',
  className,
  leftIcon,
}: ButtonProps) {
  return (
    <StyledButton
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      className={className}
    >
      {isLoading ? (
        <SpinnerRing />
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </StyledButton>
  );
}