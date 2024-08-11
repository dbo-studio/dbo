import { Components, Theme } from '@mui/material';

export default function Checkbox(theme: Theme): Components {
  return {
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '& .MuiSvgIcon-root': {
            fill: theme.palette.primary.main
          }
        }
      }
    }
  };
}
