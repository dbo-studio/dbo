import locales from '@/locales';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import type { ThemeItemProps } from '../../types';
import { ThemeItemStyled } from './ThemeItem.styled';

export default function ThemeItem({ isDark, selected, onClick }: ThemeItemProps): JSX.Element {
  return (
    <ThemeItemStyled onClick={(): void => onClick()} selected={selected}>
      <img
        width={150}
        height={93}
        alt={isDark ? 'dark' : 'light'}
        src={`/images/theme_${isDark ? 'dark' : 'light'}.svg`}
      />
      <Typography color={'textText'} variant='body2'>
        {isDark ? locales.dark : locales.light}
      </Typography>
    </ThemeItemStyled>
  );
}
