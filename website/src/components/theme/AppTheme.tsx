'use client';

import type { JSX } from '@emotion/react/jsx-runtime';
import type { ThemeOptions } from '@mui/material/styles';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import * as React from 'react';
import { dataDisplayCustomizations } from './customizations/dataDisplay';
import { inputsCustomizations } from './customizations/inputs';
import { navigationCustomizations } from './customizations/navigation';
import { surfacesCustomizations } from './customizations/surfaces';
import { colorSchemes, shadows, shape, typography } from './customizations/themePrimitives';

interface AppThemeProps {
  children: React.ReactNode;
  /**
   * This is for the docs site. You can ignore it or remove it.
   */
  disableCustomTheme?: boolean;
  themeComponents?: ThemeOptions['components'];
}

export default function AppTheme(props: AppThemeProps): JSX.Element {
  const { children, disableCustomTheme, themeComponents } = props;
  const theme = React.useMemo(() => {
    return disableCustomTheme
      ? {}
      : createTheme({
          cssVariables: {
            colorSchemeSelector: 'data-mui-color-scheme',
            cssVarPrefix: 'template'
          },
          colorSchemes,
          typography,
          shadows,
          shape,
          components: {
            ...inputsCustomizations,
            ...dataDisplayCustomizations,
            ...navigationCustomizations,
            ...surfacesCustomizations,
            ...themeComponents
          }
        });
  }, [disableCustomTheme, themeComponents]);
  if (disableCustomTheme) {
    return <>{children}</>;
  }
  return (
    <ThemeProvider theme={theme} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
