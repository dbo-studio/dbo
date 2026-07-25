import type { ThemeOptions } from '@mui/material/styles';

export const baseTypography: NonNullable<ThemeOptions['typography']> = {
  fontSize: 13,
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4
  },
  subtitle2: {
    fontSize: '0.8125rem',
    lineHeight: 1.4
  },
  body2: {
    fontSize: '0.8125rem',
    lineHeight: 1.5
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4
  }
};
