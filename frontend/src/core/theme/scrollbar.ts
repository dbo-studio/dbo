import type { Theme } from '@mui/material/styles';

export const scrollbarStyles = (theme: Theme): Record<string, unknown> => ({
  '::-webkit-scrollbar': {
    webkitAppearance: 'none',
    width: '6px',
    height: '6px'
  },
  '::-webkit-scrollbar-track': {
    background: 'transparent'
  },
  '::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
    borderRadius: '3px'
  },
  '::-webkit-scrollbar-thumb:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'
  }
});
