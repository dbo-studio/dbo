'use client';

import { appConfig } from '@/appConfig';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { ThemeProvider as MUIThemeProvider, type ThemeOptions, createTheme } from '@mui/material/styles';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import palette from './palette';

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const { isDark } = useSettingStore();

  const themeOptions: ThemeOptions = {
    palette: palette(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light),
    direction: appConfig.direction
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
