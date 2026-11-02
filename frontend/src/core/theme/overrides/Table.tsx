import type { Components, Theme } from '@mui/material';

// Mirrors the Data tab grid (DataGridTable.styled.ts) so every table in the app reads the same.
export default function Table(theme: Theme): Components {
  const cell = {
    padding: '2px 8px',
    fontSize: theme.typography.subtitle2.fontSize,
    color: theme.palette.text.text,
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`
  };

  return {
    MuiTable: {
      styleOverrides: {
        root: { borderCollapse: 'separate', borderSpacing: 0 }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            ...cell,
            fontWeight: 'normal',
            backgroundColor: theme.palette.background.default
          }
        }
      }
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': { ...cell, minWidth: '100px' },
          '& .MuiTableRow-root:nth-of-type(even)': { backgroundColor: theme.palette.background.subdued }
        }
      }
    }
  };
}
