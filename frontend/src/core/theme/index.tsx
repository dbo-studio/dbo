import { constants } from '@/core/constants';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { Direction } from '@mui/material';
import { createTheme, ThemeProvider as MUIThemeProvider, type ThemeOptions } from '@mui/material/styles';
import { type JSX } from 'react';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import {
  dboPalette,
  elasticPalette,
  githubPalette,
  materialPalette,
  shadcnPalette,
  solarizedPalette,
  vscodePalette
} from './palettes';
import { validateTheme } from './themeRegistry';

const paletteMap: Record<string, (mode: ThemeModeEnum) => Record<string, unknown>> = {
  dbo: dboPalette,
  elastic: elasticPalette,
  shadcn: shadcnPalette,
  vscode: vscodePalette,
  material: materialPalette,
  github: githubPalette,
  solarized: solarizedPalette
};

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);
  const validatedThemeName = validateTheme(theme.themeName);

  if (validatedThemeName !== theme.themeName) {
    updateTheme({ themeName: validatedThemeName });
  }

  const selectedPalette = paletteMap[validatedThemeName] || dboPalette;

  const themeOptions: ThemeOptions = {
    palette: selectedPalette(theme.isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light),
    direction: constants.direction as Direction,
    typography: {
      fontFamily: theme.appFont
    }
  };

  const muiTheme = createTheme(themeOptions);
  muiTheme.components = componentsOverride(muiTheme);

  return <MUIThemeProvider theme={muiTheme}>{children}</MUIThemeProvider>;
}
