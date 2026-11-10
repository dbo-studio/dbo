import { ThemeModeEnum } from '../enums';
import dboPalette from './palettes/dbo';

type BootPalette = { background: string; text: string; accent: string; onAccent: string };

/**
 * Colors for UI that renders outside the MUI ThemeProvider (the crash screen shown when React itself fails).
 * Taken from the dbo palette so they never drift from the app theme.
 */
export const getBootColors = (isDark: boolean): BootPalette => {
  const palette = dboPalette(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light) as {
    background: { default: string };
    text: { primary: string };
    primary: { main: string };
  };

  return {
    background: palette.background.default,
    text: palette.text.primary,
    accent: palette.primary.main,
    onAccent: isDark ? palette.background.default : '#fff'
  };
};
