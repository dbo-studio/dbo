import type { Theme } from '@mui/material/styles';

export const scrollbarStyles = (theme: Theme): Record<string, unknown> => {
  const isDark = theme.palette.mode === 'dark';
  const thumb = isDark ? theme.palette.grey[600] : 'rgba(0, 0, 0, 0.2)';
  const thumbHover = isDark ? theme.palette.grey[500] : 'rgba(0, 0, 0, 0.35)';

  return {
    scrollbarWidth: 'thin',
    scrollbarColor: `${thumb} transparent`,
    '::-webkit-scrollbar': {
      webkitAppearance: 'none',
      width: '6px',
      height: '6px'
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent'
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: thumb,
      borderRadius: '3px'
    },
    '::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHover
    }
  };
};
