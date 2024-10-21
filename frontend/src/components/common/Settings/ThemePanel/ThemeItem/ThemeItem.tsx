import locales from '@/locales';
import { Typography } from '@mui/material';
import type { ThemeItemProps } from '../../types';
import { ThemeItemStyled } from './ThemeItem.styled';

export default function ThemeItem({ isDark, selected, onClick }: ThemeItemProps) {
  return (
    <ThemeItemStyled onClick={() => onClick()} selected={selected}>
      <img alt={isDark ? 'dark' : 'light'} src={`/images/theme_${isDark ? 'dark' : 'light'}.svg`} />
      <Typography variant='body2'>{isDark ? locales.dark : locales.light}</Typography>
    </ThemeItemStyled>
  );
}
