import type { Interpolation, Theme } from '@mui/material';

export const globalStyles = (theme: Theme): Interpolation<Theme> => {
  return {
    '*': {
      userSelect: 'none', // Disable text selection
      WebkitUserSelect: 'none', // For Safari
      msUserSelect: 'none' // For IE/Edge
    },
    html: {
      overscrollBehavior: 'none'
    },
    '*::-webkit-scrollbar': {
      width: '3px !important'
    },
    '*::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' + ' !important',
      borderRadius: '3px !important'
    },
    '*::-webkit-scrollbar-thumb:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' + ' !important'
    },
    '*::-webkit-scrollbar-track': {
      backgroundColor: 'transparent !important'
    }
  };
};
