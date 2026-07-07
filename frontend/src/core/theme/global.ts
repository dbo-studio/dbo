import type { Interpolation, Theme } from '@mui/material';
import { scrollbarStyles } from './scrollbar';

export const globalStyles = (theme: Theme): Interpolation<Theme> => {
  return {
    html: {
      overscrollBehavior: 'none',
      height: '100%'
    },
    '#root': {
      height: '100%'
    },
    '.select-none': {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      msUserSelect: 'none',
      MozUserSelect: 'none'
    },
    '.select-text': {
      userSelect: 'text',
      WebkitUserSelect: 'text',
      msUserSelect: 'text',
      MozUserSelect: 'text'
    },
    ...scrollbarStyles(theme)
  };
};
