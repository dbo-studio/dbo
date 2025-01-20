import { variables } from '@/core/theme/variables.ts';
import type { Theme } from '@mui/material';

export const globalStyles = (theme: Theme) => {
  return {
    '*': {
      userSelect: 'none', // Disable text selection
      WebkitUserSelect: 'none', // For Safari
      msUserSelect: 'none' // For IE/Edge
    },
    html: {
      overscrollBehavior: 'none'
    },
    '& .htContextMenu td': {
      background: theme.palette.background.default
    },
    '& .htContextMenu .ht_master table.htCore': {
      background: theme.palette.background.default,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)',
      border: `1px solid ${theme.palette.divider}`,
      minWidth: 180,
      padding: '0 2px',
      borderRadius: variables.radius.medium
    }
  };
};
