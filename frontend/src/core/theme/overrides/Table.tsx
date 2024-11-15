import type { Components, Theme } from '@mui/material';

export default function Table(theme: Theme): Components {
  return {
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '4px 8px',
            color: theme.palette.text.title
          },
          tr: { borderBottom: `1.5px solid ${theme.palette.divider}` }
        }
      }
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '4px 8px',
            minWidth: '100px'
          },
          'td,th': { borderBottom: `1px solid ${theme.palette.divider}` }
        }
      }
    }
  };
}
