import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, Typography, useMediaQuery } from '@mui/material';
import { type JSX, useEffect } from 'react';
import ThemeItem from './ThemeItem/ThemeItem';

export default function Theme(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    if (theme.isDark === undefined && prefersDarkMode) {
      updateTheme({ isDark: prefersDarkMode });
    }
  }, []);

  const handleToggle = (isDark: boolean): void => {
    updateTheme({
      isDark,
      editorTheme: isDark ? 'github-dark' : 'github-light'
    });
  };

  return (
    <Box>
      <Box mb={1} mt={3}>
        <Typography variant='body1'>{locales.application_theme}</Typography>
      </Box>
      <Divider />
      <Box display={'flex'} mt={2} mb={4}>
        <ThemeItem selected={theme.isDark !== false} onClick={(): void => handleToggle(true)} isDark={true} />
        <ThemeItem selected={!theme.isDark} onClick={(): void => handleToggle(false)} isDark={false} />
      </Box>
    </Box>
  );
}
