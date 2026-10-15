import { createTheme, type Theme } from '@mui/material/styles';

const TOUCH_TARGET = 44;

/**
 * Touch density on top of the active app theme (palette, fonts and overrides are kept).
 * 16px inputs stop iOS from zooming on focus; controls get a 44px minimum hit area.
 */
export const withMobileDensity = (outer: Theme): Theme =>
  createTheme(outer, {
    typography: { fontSize: 14 },
    components: {
      MuiButton: { styleOverrides: { root: { minHeight: TOUCH_TARGET } } },
      MuiIconButton: { styleOverrides: { root: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET } } },
      MuiToggleButton: { styleOverrides: { root: { minHeight: TOUCH_TARGET } } },
      MuiListItemButton: { styleOverrides: { root: { minHeight: TOUCH_TARGET + 4 } } },
      MuiInputBase: { styleOverrides: { input: { fontSize: 16 } } }
    }
  });
