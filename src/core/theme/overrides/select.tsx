import { Components, Theme } from '@mui/material/styles';

export default function Select(theme: Theme): Components {
  return {
    MuiSelect: {
      styleOverrides: {
        root: {
          background: theme.palette.background.default
        }
      }
    }
  };
}
