import React from 'react';
import { render, type RenderAPI } from '@testing-library/react-native';
import type { ThemeProvider as ThemeProviderComponent } from '../study-sakha-design-system-native/src/theme/ThemeProvider';

export function renderWithSSDS(ui: React.ReactElement): RenderAPI {
  const { ThemeProvider } = require('../study-sakha-design-system-native/src/theme/ThemeProvider') as {
    ThemeProvider: typeof ThemeProviderComponent;
  };
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider disablePersistence>{children}</ThemeProvider>
    ),
  });
}
