import { constants } from '@/core/constants';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { Direction } from '@mui/material';
import { createTheme, ThemeProvider as MUIThemeProvider, type ThemeOptions } from '@mui/material/styles';
import type React from 'react';
import { type JSX } from 'react';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import { dboPalette } from './palettes';

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props): JSX.Element {
  const settingsTheme = useSettingStore((state) => state.theme);
  const themeOptions: ThemeOptions = {
    palette: dboPalette(settingsTheme.isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light),
    direction: constants.direction as Direction,
    typography: {
      fontFamily: settingsTheme.appFont
    }
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
