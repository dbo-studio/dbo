import { Components } from '@mui/material';

export default function Table(): Components {
  return {
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '4px 8px'
          }
        }
      }
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '4px 8px 0px',
            minWidth: '100px'
          }
        }
      }
    }
  };
}
