import {variables} from '@/core/theme/variables.ts';
import type {Theme} from '@mui/material';

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
      padding: '3px',
      borderRadius: variables.radius.medium,
      '& .htSeparator': {
        padding: 0,
        '& div': {
          background: theme.palette.divider,
          height: '1px'
        }
      },
      '& tr': {
        background: 'none'
      },
      '& td': {
        padding: '4px 8px',
        background: theme.palette.background.default,
        color: theme.palette.text.text,
        borderRadius: variables.radius.small,
        margin: '1px',
        border: 'none',
        '&:hover': {
          backgroundColor: theme.palette.background.paper
        }
      }
    }
  };
};
