export const theme = {
  colors: {
    background: '#EAF2FC',
    surface: '#FFFFFF',
    primary: '#4A86D9',
    primaryLight: '#E1EDF8',
    primaryGradient: 'linear-gradient(135deg, #4A86D9 0%, #6BA4E8 100%)',
    textPrimary: '#1A1F36',
    textSecondary: '#8A94A6',
    textOnPrimary: '#FFFFFF',
    danger: '#FF6B8A',
    warning: '#FFB347',
    success: '#4BC8A0',
    hairline: '#E5EDF5',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '24px',
    full: '9999px',
  },
  shadow: {
    card: '0 4px 20px rgba(74, 134, 217, 0.08)',
    button: '0 4px 16px rgba(74, 134, 217, 0.35)',
  },
  font: {
    family: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
  },
} as const;

export type AppTheme = typeof theme;
