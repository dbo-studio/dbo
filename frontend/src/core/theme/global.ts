import type { Interpolation, Theme } from '@mui/material';

export const globalStyles = (_: Theme): Interpolation<Theme> => {
  return {
    '*': {
      userSelect: 'none', // Disable text selection
      WebkitUserSelect: 'none', // For Safari
      msUserSelect: 'none' // For IE/Edge
    },
    html: {
      overscrollBehavior: 'none'
    }
  };
};
