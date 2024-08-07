'use client';

import { appConfig } from '@/appConfig';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { ThemeProvider as MUIThemeProvider, ThemeOptions, createTheme } from '@mui/material/styles';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import palette from './palette';
import typography from './typography';

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const { isDark } = useSettingStore();

  const themeOptions: ThemeOptions = {
    typography,
    palette: palette(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light),
    // palette: palette(ThemeModeEnum.Dark),
    direction: appConfig.direction
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
