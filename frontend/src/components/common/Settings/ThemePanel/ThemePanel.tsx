import locales from '@/locales';
import {useSettingStore} from '@/store/settingStore/setting.store';
import {Box, Divider, Typography, useMediaQuery} from '@mui/material';
import {type JSX, useEffect} from 'react';
import ThemeItem from './ThemeItem/ThemeItem';

export default function ThemePanel(): JSX.Element {
  const { isDark, toggleIsDark } = useSettingStore();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    if (isDark === undefined && prefersDarkMode) {
      toggleIsDark(prefersDarkMode);
    }
  }, []);

  const handleToggle = (isDark: boolean): void => {
    toggleIsDark(isDark);
  };

  return (
    <Box>
      <Box mb={1}>
        <Typography color={'textTitle'} variant='h6'>
          {locales.theme}
        </Typography>
        <Typography color={'textText'} variant='body2'>
          {locales.select_theme_description}
        </Typography>
      </Box>
      <Divider />
      <Box display={'flex'} mt={2}>
        <ThemeItem selected={isDark !== false} onClick={(): void => handleToggle(true)} isDark={true} />
        <ThemeItem selected={!isDark} onClick={(): void => handleToggle(false)} isDark={false} />
      </Box>
    </Box>
  );
}
