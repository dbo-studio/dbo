import { ThemeModeEnum } from '@/core/enums';
import { paletteMap } from '@/core/theme';

export type ThemePaletteSwatch = {
  surface: string;
  panel: string;
  primary: string;
  secondary: string;
  text: string;
};

/** The colors of a palette in the mode being previewed. */
export const swatchOf = (themeId: string, isDark: boolean): ThemePaletteSwatch => {
  const palette = paletteMap[themeId]?.(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light) as
    | {
        primary: { main: string };
        secondary: { main: string };
        background: { default: string; paper: string };
        text: { text: string };
      }
    | undefined;

  return {
    surface: palette?.background.default ?? 'transparent',
    panel: palette?.background.paper ?? 'transparent',
    primary: palette?.primary.main ?? 'transparent',
    secondary: palette?.secondary.main ?? 'transparent',
    text: palette?.text.text ?? 'transparent'
  };
};
