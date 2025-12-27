import { constants } from '@/core/constants';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { Direction } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, type ThemeOptions, createTheme } from '@mui/material/styles';
import type React from 'react';
import type { JSX } from 'react';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import palette from './palette';

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props): JSX.Element {
  const settingsTheme = useSettingStore((state) => state.theme);

  const themeOptions: ThemeOptions = {
    palette: palette(settingsTheme.isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light),
    direction: constants.direction as Direction,
    typography: {
      fontFamily: settingsTheme.appFont
    }
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
