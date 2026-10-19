'use client';

import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import StyledComponentsRegistry from './registry';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </StyledComponentsRegistry>
  );
}
