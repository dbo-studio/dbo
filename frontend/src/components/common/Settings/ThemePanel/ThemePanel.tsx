import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect } from 'react';
import ThemeItem from './ThemeItem/ThemeItem';

export default function ThemePanel() {
  const { isDark, updateIsDark } = useSettingStore();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useTheme();

  useEffect(() => {
    if (isDark === undefined && prefersDarkMode) {
      updateIsDark(prefersDarkMode);
    }
  }, []);

  const handleToggle = (isDark: boolean) => {
    updateIsDark(isDark);
  };

  return (
    <Box>
      <Typography color={'textTitle'} variant='h6'>
        {locales.theme}
      </Typography>
      <Typography color={'textText'} variant='body2'>
        {locales.select_theme_description}
      </Typography>

      <Box display={'flex'} mt={theme.spacing(2)}>
        <ThemeItem selected={isDark !== false} onClick={() => handleToggle(true)} isDark={true} />
        <ThemeItem selected={!isDark} onClick={() => handleToggle(false)} isDark={false} />
      </Box>
    </Box>
  );
}
