import type { Components, Theme } from '@mui/material/styles';

export default function Typography(theme: Theme): Components {
  return {
    MuiTypography: {
      styleOverrides: {
        root: {
          color: theme.palette.text.text
        }
      }
    }
  };
}
