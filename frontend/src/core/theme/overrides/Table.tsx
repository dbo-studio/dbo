import type { Components, Theme } from '@mui/material';

// Mirrors the Data tab grid (DataGridTable.styled.ts) so every table in the app reads the same.
export default function Table(theme: Theme): Components {
  const cell = {
    padding: '2px 8px',
    fontSize: theme.typography.subtitle2.fontSize,
    color: theme.palette.text.text,
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  } as const;

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
            lineHeight: 1.5, // th inherits the body line height in DataGridTable.styled.ts
            backgroundColor: theme.palette.background.default
          }
        }
      }
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          // Exactly the grid's 22px row: its td is 22px high, text centred in a 2px/8px padded box.
          '& .MuiTableCell-root': { ...cell, minWidth: '100px', height: '22px', padding: '0 8px', lineHeight: '20px' },
          '& .MuiTableRow-root:nth-of-type(even)': { backgroundColor: theme.palette.background.subdued }
        }
      }
    }
  };
}
